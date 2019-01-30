/*
 * Copyright (c) 2017, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.wso2.carbon.data.provider.rdbms;

import com.google.gson.Gson;
import com.google.gson.JsonElement;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.wso2.carbon.config.ConfigurationException;
import org.wso2.carbon.data.provider.AbstractDataProvider;
import org.wso2.carbon.data.provider.DataProvider;
import org.wso2.carbon.data.provider.InputFieldTypes;
import org.wso2.carbon.data.provider.ProviderConfig;
import org.wso2.carbon.data.provider.bean.DataSetMetadata;
import org.wso2.carbon.data.provider.exception.DataProviderException;
import org.wso2.carbon.data.provider.rdbms.bean.RDBMSDataProviderConfBean;
import org.wso2.carbon.data.provider.rdbms.config.RDBMSDataProviderConf;
import org.wso2.carbon.data.provider.rdbms.utils.RDBMSQueryManager;
import org.wso2.carbon.database.query.manager.exception.QueryMappingNotAvailableException;
import org.wso2.carbon.datasource.core.exception.DataSourceException;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.*;
import javax.sql.DataSource;

import static org.wso2.carbon.data.provider.rdbms.utils.RDBMSProviderConstants.CUSTOM_QUERY_PLACEHOLDER;
import static org.wso2.carbon.data.provider.rdbms.utils.RDBMSProviderConstants.INCREMENTAL_COLUMN_PLACEHOLDER;
import static org.wso2.carbon.data.provider.rdbms.utils.RDBMSProviderConstants.LIMIT_VALUE_PLACEHOLDER;
import static org.wso2.carbon.data.provider.rdbms.utils.RDBMSProviderConstants.RECORD_DELETE_QUERY;
import static org.wso2.carbon.data.provider.rdbms.utils.RDBMSProviderConstants.RECORD_GREATER_THAN_QUERY;
import static org.wso2.carbon.data.provider.rdbms.utils.RDBMSProviderConstants.RECORD_LIMIT_QUERY;
import static org.wso2.carbon.data.provider.rdbms.utils.RDBMSProviderConstants.TABLE_NAME_PLACEHOLDER;
import static org.wso2.carbon.data.provider.rdbms.utils.RDBMSProviderConstants.TOTAL_RECORD_COUNT_QUERY;
import static org.wso2.carbon.data.provider.utils.DataProviderValueHolder.getDataProviderHelper;

/**
 * RDBMS data provider abstract class.
 */
public class AbstractRDBMSDataProvider extends AbstractDataProvider {
    private static final Logger LOGGER = LoggerFactory.getLogger(AbstractRDBMSDataProvider.class);
    private String recordLimitQuery;
    private String purgingQuery;
    private String totalRecordCountQuery;
    private String greaterThanWhereSQLQuery;
    private DataSetMetadata metadata;
    private int columnCount;
    private RDBMSDataProviderConf rdbmsProviderConfig;
    private RDBMSDataProviderConfBean rdbmsDataProviderConfBean;

    @Override
    public DataProvider init(String topic, String sessionId, JsonElement jsonElement) throws DataProviderException {
        try {
            rdbmsDataProviderConfBean = getDataProviderHelper().getConfigProvider().
                    getConfigurationObject(RDBMSDataProviderConfBean.class);
        } catch (ConfigurationException e) {
            throw new DataProviderException("unable to load database query configuration: " + e.getMessage(), e);
        }
        ProviderConfig providerConfig = new Gson().fromJson(jsonElement, RDBMSDataProviderConf.class);
        super.init(topic, sessionId, providerConfig);
        Connection connection = null;
        PreparedStatement statement = null;
        ResultSet resultSet = null;
        try {
            connection = getConnection(rdbmsProviderConfig.getDatasourceName());
            String databaseName = connection.getMetaData().getDatabaseProductName();
            String databaseVersion = connection.getMetaData().getDatabaseProductVersion();
            RDBMSQueryManager rdbmsQueryManager = new RDBMSQueryManager(databaseName, databaseVersion);
            totalRecordCountQuery = rdbmsQueryManager.getQuery(TOTAL_RECORD_COUNT_QUERY);
            if (totalRecordCountQuery != null) {
                totalRecordCountQuery = totalRecordCountQuery.replace(TABLE_NAME_PLACEHOLDER, rdbmsProviderConfig
                        .getTableName());
            }
            purgingQuery = rdbmsQueryManager.getQuery(RECORD_DELETE_QUERY);
            if (purgingQuery != null) {
                purgingQuery = purgingQuery.replace(TABLE_NAME_PLACEHOLDER, rdbmsProviderConfig
                        .getTableName()).replace(INCREMENTAL_COLUMN_PLACEHOLDER, rdbmsProviderConfig
                        .getIncrementalColumn());
            }
            greaterThanWhereSQLQuery = rdbmsQueryManager.getQuery(RECORD_GREATER_THAN_QUERY);
            if (greaterThanWhereSQLQuery != null) {
                greaterThanWhereSQLQuery = greaterThanWhereSQLQuery.replace
                        (INCREMENTAL_COLUMN_PLACEHOLDER, getRdbmsProviderConfig().getIncrementalColumn())
                        .replace(LIMIT_VALUE_PLACEHOLDER, Long.toString(rdbmsProviderConfig
                                .getPublishingLimit())).replace(CUSTOM_QUERY_PLACEHOLDER, rdbmsProviderConfig
                                .getQuery().getAsJsonObject().get("query").getAsString());
            }
            recordLimitQuery = rdbmsQueryManager.getQuery(RECORD_LIMIT_QUERY);
            if (recordLimitQuery != null) {
                recordLimitQuery = recordLimitQuery.replace(INCREMENTAL_COLUMN_PLACEHOLDER, rdbmsProviderConfig
                        .getIncrementalColumn()).replace(LIMIT_VALUE_PLACEHOLDER, Long.toString(rdbmsProviderConfig
                        .getPublishingLimit())).replace(CUSTOM_QUERY_PLACEHOLDER,
                        rdbmsProviderConfig.getQuery().getAsJsonObject().get("query").getAsString());
                try {
                    statement = connection.prepareStatement(recordLimitQuery);
                    resultSet = statement.executeQuery();
                    ResultSetMetaData resultSetMetaData = resultSet.getMetaData();
                    metadata = new DataSetMetadata(resultSetMetaData.getColumnCount());
                    columnCount = metadata.getColumnCount();
                    List<String> timeColumns = null;
                    if (rdbmsProviderConfig.getTimeColumns() != null && !rdbmsProviderConfig.getTimeColumns()
                            .isEmpty()) {
                        timeColumns = Arrays.asList(rdbmsProviderConfig.getTimeColumns().split(","));
                    }
                    for (int i = 0; i < columnCount; i++) {
                        boolean isTimeColumnFound = false;
                        if (timeColumns != null) {
                            for (String timeColumn : timeColumns) {
                                if (timeColumn.equalsIgnoreCase(resultSetMetaData.getColumnName(i + 1))) {
                                    metadata.put(i, resultSetMetaData.getColumnName(i + 1), DataSetMetadata.Types.TIME);
                                    isTimeColumnFound = true;
                                }
                            }
                        }
                        if (!isTimeColumnFound) {
                            metadata.put(i, resultSetMetaData.getColumnName(i + 1),
                                    getMetadataTypes(resultSetMetaData.getColumnTypeName(i + 1)));
                        }
                    }
                } catch (SQLException e) {
                    throw new DataProviderException("SQL exception occurred " + e.getMessage(), e);
                }
            }
        } catch (SQLException | DataSourceException e) {
            throw new DataProviderException("Failed to load purging template query: " + e.getMessage(), e);
        } catch (IOException | QueryMappingNotAvailableException | ConfigurationException e) {
            throw new DataProviderException("unable to load database query configuration: " + e.getMessage(), e);
        } finally {
            cleanupConnection(resultSet, statement, connection);
        }
        return this;
    }

    /**
     * get connection object for the instance.
     *
     * @return java.sql.Connection object for the dataProvider Configuration
     */
    public static Connection getConnection(String dataSourceName)
            throws SQLException, DataSourceException {
        return ((DataSource) getDataProviderHelper().getDataSourceService().
                getDataSource(dataSourceName)).getConnection();
    }

    public static void cleanupConnection(ResultSet rs, Statement stmt, Connection conn) {
        if (rs != null) {
            try {
                rs.close();
            } catch (SQLException e) {
                LOGGER.error("Error on closing resultSet " + e.getMessage(), e);
            }
        }
        if (stmt != null) {
            try {
                stmt.close();
            } catch (SQLException e) {
                LOGGER.error("Error on closing statement " + e.getMessage(), e);
            }
        }
        if (conn != null) {
            try {
                conn.close();
            } catch (SQLException e) {
                LOGGER.error("Error on closing connection " + e.getMessage(), e);
            }
        }
    }

    /**
     * Get metadata type(linear,ordinal,time) for the given data type of the data base.
     *
     * @param dataType String data type name provided by the result set metadata
     * @return String metadata type
     */
    public DataSetMetadata.Types getMetadataTypes(String dataType) {
        if (Arrays.asList(rdbmsDataProviderConfBean.getLinearTypes()).contains(dataType.toUpperCase(Locale.ENGLISH))) {
            return DataSetMetadata.Types.LINEAR;
        } else if (Arrays.asList(rdbmsDataProviderConfBean.getOrdinalTypes()).contains(dataType.toUpperCase(Locale
                .ENGLISH))) {
            return DataSetMetadata.Types.ORDINAL;
        } else if (Arrays.asList(rdbmsDataProviderConfBean.getTimeTypes()).contains(dataType.toUpperCase(Locale
                .ENGLISH))) {
            return DataSetMetadata.Types.TIME;
        } else {
            return DataSetMetadata.Types.OBJECT;
        }
    }

    public boolean querySanitizingValidator(String query, String tableName) {
        boolean isValidQuery = true;
        if (query != null && tableName != null) {
            if (rdbmsDataProviderConfBean.getSqlSelectQuerySanitizingRegex() != null) {
                isValidQuery = query.matches(rdbmsDataProviderConfBean.getSqlSelectQuerySanitizingRegex());
            }
            if (rdbmsDataProviderConfBean.getSqlWhereQuerySanitizingRegex() != null) {
                isValidQuery = query.matches(rdbmsDataProviderConfBean.getSqlWhereQuerySanitizingRegex());
            }
            if (rdbmsDataProviderConfBean.getSqlTableNameSanitizingRegex() != null) {
                isValidQuery = tableName.matches(rdbmsDataProviderConfBean.getSqlTableNameSanitizingRegex());
            }
        } else {
            isValidQuery = false;
        }
        return isValidQuery;
    }

    public String getRecordLimitQuery() {
        return recordLimitQuery;
    }

    public String getPurgingQuery() {
        return purgingQuery;
    }

    public String getTotalRecordCountQuery() {
        return totalRecordCountQuery;
    }

    public int getColumnCount() {
        return columnCount;
    }

    public String getGreaterThanWhereSQLQuery() {
        return greaterThanWhereSQLQuery;
    }

    public RDBMSDataProviderConf getRdbmsProviderConfig() {
        return rdbmsProviderConfig;
    }

    public RDBMSDataProviderConfBean getRdbmsDataProviderConfBean() {
        return rdbmsDataProviderConfBean;
    }

    @Override
    public void setProviderConfig(ProviderConfig providerConfig) {
        this.rdbmsProviderConfig = (RDBMSDataProviderConf) providerConfig;
    }

    @Override
    public DataSetMetadata getMetadata() {
        return metadata;
    }

    @Override
    public boolean configValidator(ProviderConfig providerConfig) throws DataProviderException {
        RDBMSDataProviderConf rdbmsDataProviderConf = (RDBMSDataProviderConf) providerConfig;
        return querySanitizingValidator(rdbmsDataProviderConf.getQuery().getAsJsonObject().get("query").getAsString(),
                rdbmsDataProviderConf.getTableName());
    }

    @Override
    public String providerName() {
        return this.getClass().getSimpleName();
    }

    @Override
    public DataSetMetadata dataSetMetadata() {
        return metadata;
    }

    @Override
    public String providerConfig() {
        Map<String, String> renderingTypes = new HashMap<>();
        Map<String, String> renderingHints = new HashMap<>();
        String providerDescription = "RDBMS \u6570\u636e\u63d0\u4f9b\u8005\u652f\u6301\u4ece\u4efb\u4f55SQL\u6570\u636e\u5e93\u8868\u4e2d\u83b7\u53d6\u6570\u636e\u7ed9\u5c0f\u90e8\u4ef6\u4f7f\u7528"
                + ". \u6279\u6570\u636e\u63d0\u4f9b\u8005\u5141\u8bb8\u7528\u6237\u6279\u91cf\u83b7\u53d6\u8868\u4e2d\u7684\u6240\u6709\u6570\u636e\u548c\u6d41\u6570\u636e"
                + " \u540c\u65f6\u8fd8\u5141\u8bb8\u7528\u6237\u4f7f\u7528\u589e\u91cf\u6570\u636e\u5217\u4ee5\u6d41\u65b9\u5f0f\u68c0\u7d22\u6570\u636e.";
        renderingTypes.put("publishingInterval", InputFieldTypes.NUMBER);
        renderingHints.put("publishingInterval",
                "\u63a7\u5236\u5c06\u6570\u636e\u53d1\u9001\u5230\u5c0f\u90e8\u4ef6\u7684\u901f\u7387");
        renderingTypes.put("purgingInterval", InputFieldTypes.NUMBER);
        renderingHints.put("purgingInterval",
                "\u63a7\u5236\u5bf9\u8868\u8fd0\u884c\u6570\u636e\u6e05\u9664\u64cd\u4f5c\u7684\u901f\u7387");
        renderingTypes.put("isPurgingEnable", InputFieldTypes.SWITCH);
        renderingHints.put("isPurgingEnable",
                "\u5141\u8bb8\u5b9a\u671f\u5bf9\u8868\u6267\u884c\u6570\u636e\u5220\u9664\u64cd\u4f5c");
        renderingTypes.put("publishingLimit", InputFieldTypes.NUMBER);
        renderingHints.put("publishingLimit", "\u4e00\u6b21\u53d1\u9001\u7684\u8bb0\u5f55\u6570\u9650\u5236");
        renderingTypes.put("purgingLimit", InputFieldTypes.NUMBER);
        renderingHints.put("purgingLimit", "\u4e00\u6b21\u5220\u9664\u7684\u6570\u636e\u6761\u76ee\u9650\u5236");
        renderingTypes.put("datasourceName", InputFieldTypes.TEXT_FIELD);
        renderingHints.put("datasourceName",
                "\u5728deployment.yaml\u6587\u4ef6\u4e2d\u914d\u7f6e\u7684\u6570\u636e\u6e90\u540d\u79f0");
        renderingTypes.put("queryData", InputFieldTypes.DYNAMIC_SQL_CODE);
        renderingTypes.put("tableName", InputFieldTypes.TEXT_FIELD);
        renderingHints.put("tableName", "\u83b7\u53d6\u6570\u636e\u7684\u6570\u636e\u5e93\u8868\u540d");
        renderingTypes.put("incrementalColumn", InputFieldTypes.TEXT_FIELD);
        renderingHints.put("incrementalColumn",
                "\u8868\u7684\u5217\uff0c\u7528\u4e8e\u6807\u8bc6\u589e\u91cf\u6570\u636e");
        renderingTypes.put("timeColumns", InputFieldTypes.TEXT_FIELD);
        renderingHints.put("timeColumns",
                "\u8868\u7684\u5217\uff0c\u8be5\u5217\u5e94\u5305\u542b\u6570\u636e\u7684\u65f6\u95f4\u6233");
        return new Gson().toJson(
                new Object[] { renderingTypes, new RDBMSDataProviderConf(), renderingHints, providerDescription });
    }

    @Override
    public void publish(String topic, String sessionId) {
    }

    @Override
    public void purging() {
        if (totalRecordCountQuery != null && purgingQuery != null) {
            Connection connection;
            try {
                connection = getConnection(rdbmsProviderConfig.getDatasourceName());
                PreparedStatement statement = null;
                ResultSet resultSet = null;
                try {
                    int totalRecordCount = 0;
                    statement = connection.prepareStatement(totalRecordCountQuery);
                    resultSet = statement.executeQuery();
                    while (resultSet.next()) {
                        totalRecordCount = resultSet.getInt(1);
                    }
                    if (totalRecordCount > rdbmsProviderConfig.getPurgingLimit()) {
                        String query = purgingQuery.replace(LIMIT_VALUE_PLACEHOLDER,
                                Long.toString(totalRecordCount - rdbmsProviderConfig.getPurgingLimit()));
                        statement = connection.prepareStatement(query);
                        statement.executeUpdate();
                    }
                } catch (SQLException e) {
                    LOGGER.error("SQL exception occurred " + e.getMessage(), e);
                } finally {
                    cleanupConnection(resultSet, statement, connection);
                }
            } catch (SQLException | DataSourceException e) {
                LOGGER.error("Failed to create a connection to the database " + e.getMessage(), e);
            }
        }
    }
}
