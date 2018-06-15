/*
 *  Copyright (c) 2017, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 *  WSO2 Inc. licenses this file to you under the Apache License,
 *  Version 2.0 (the "License"); you may not use this file except
 *  in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing,
 *  software distributed under the License is distributed on an
 *  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *  KIND, either express or implied.  See the License for the
 *  specific language governing permissions and limitations
 *  under the License.
 *
 */

package org.wso2.carbon.business.rules.core.deployer.util;

import org.wso2.carbon.business.rules.core.datasource.configreader.DataHolder;

/**
 * Rest API service that is used to access service stub for calling a worker
 */
public class SiddhiAppDeployerFactory {
    private static final int CLIENT_CONNECTION_TIMEOUT = 1000;
    private static final int CLIENT_READ_TIMEOUT = 1000;

    public static SiddhiAppDeployerServiceStub getDeployerHttpsClient(String url,
                                                                      String username,
                                                                      String password) {
        return DataHolder.getInstance().getClientBuilderService().build(username,
                password,
                CLIENT_CONNECTION_TIMEOUT,
                CLIENT_READ_TIMEOUT,
                SiddhiAppDeployerServiceStub.class,
                url);
    }
}
