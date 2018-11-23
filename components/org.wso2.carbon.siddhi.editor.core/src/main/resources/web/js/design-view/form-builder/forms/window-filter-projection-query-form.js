/**
 * Copyright (c) 2018, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
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

define(['require', 'log', 'jquery', 'lodash', 'querySelect', 'queryOutputInsert', 'queryOutputDelete',
        'queryOutputUpdate', 'queryOutputUpdateOrInsertInto', 'queryWindowOrFunction', 'queryOrderByValue',
        'streamHandler', 'designViewUtils', 'jsonValidator'],
    function (require, log, $, _, QuerySelect, QueryOutputInsert, QueryOutputDelete, QueryOutputUpdate,
              QueryOutputUpdateOrInsertInto, QueryWindowOrFunction, QueryOrderByValue, StreamHandler, DesignViewUtils,
              JSONValidator) {

        var constants = {
            PROJECTION: 'projectionQueryDrop',
            FILTER: 'filterQueryDrop',
            WINDOW_QUERY: 'windowQueryDrop',
            FUNCTION_QUERY: 'functionQueryDrop'
        };

        /**
         * @class WindowFilterProjectionQueryForm Creates a forms to collect data from a window/filter/projection query
         * @constructor
         * @param {Object} options Rendering options for the view
         */
        var WindowFilterProjectionQueryForm = function (options) {
            if (options !== undefined) {
                this.configurationData = options.configurationData;
                this.application = options.application;
                this.formUtils = options.formUtils;
                this.consoleListManager = options.application.outputController;
                var currentTabId = this.application.tabController.activeTab.cid;
                this.designViewContainer = $('#design-container-' + currentTabId);
                this.toggleViewButton = $('#toggle-view-button-' + currentTabId);
            }
        };

        /**
         * @function generate the form for the simple queries (projection, filter and window)
         * @param element selected element(query)
         * @param formConsole Console which holds the form
         * @param formContainer Container which holds the form
         */
        WindowFilterProjectionQueryForm.prototype.generatePropertiesForm = function (element, formConsole,
                                                                                     formContainer) {
            var self = this;
            var propertyDiv = $('<div id="property-header"><h3>查询配置 </h3></div>' +
                '<div class="define-windowFilterProjection-query"></div>');
            formContainer.append(propertyDiv);
            self.designViewContainer.addClass('disableContainer');
            self.toggleViewButton.addClass('disableContainer');

            var id = $(element).parent().attr('id');
            var clickedElement = self.configurationData.getSiddhiAppConfig().getWindowFilterProjectionQuery(id);
            if (!clickedElement.getQueryInput() || !clickedElement.getQueryInput().getFrom()) {
                DesignViewUtils.prototype.warnAlert('连接一个输入');
                self.designViewContainer.removeClass('disableContainer');
                self.toggleViewButton.removeClass('disableContainer');

                // close the form window
                self.consoleListManager.removeFormConsole(formConsole);
            } else if (!clickedElement.getQueryOutput() || !clickedElement.getQueryOutput().getTarget()) {
                DesignViewUtils.prototype.warnAlert('连接一个输出流');
                self.designViewContainer.removeClass('disableContainer');
                self.toggleViewButton.removeClass('disableContainer');

                // close the form window
                self.consoleListManager.removeFormConsole(formConsole);
            } else {

                var savedStreamHandlerList = clickedElement.getQueryInput().getStreamHandlerList();
                var streamHandlerList = [];
                var noOfSavedFilters = 0;
                var noOfSavedWindows = 0;
                var noOfSavedFunctions = 0;
                _.forEach(savedStreamHandlerList, function (streamHandler) {
                    var streamHandlerObject;
                    var parameters = [];
                    if (streamHandler.getType() === "FILTER") {
                        noOfSavedFilters++;
                        streamHandlerObject = {
                            streamHandler: {
                                filter: streamHandler.getValue()
                            }
                        };
                    } else if (streamHandler.getType() === "FUNCTION") {
                        noOfSavedFunctions++;
                        _.forEach(streamHandler.getValue().getParameters(), function (savedParameterValue) {
                            var parameterObject = {
                                parameter: savedParameterValue
                            };
                            parameters.push(parameterObject);
                        });
                        streamHandlerObject = {
                            streamHandler: {
                                functionName: streamHandler.getValue().getFunction(),
                                parameters: parameters
                            }
                        };
                    } else if (streamHandler.getType() === "WINDOW") {
                        noOfSavedWindows++;
                        _.forEach(streamHandler.getValue().getParameters(), function (savedParameterValue) {
                            var parameterObject = {
                                parameter: savedParameterValue
                            };
                            parameters.push(parameterObject);
                        });
                        streamHandlerObject = {
                            streamHandler: {
                                windowName: streamHandler.getValue().getFunction(),
                                parameters: parameters
                            }
                        };
                    }
                    streamHandlerList.push(streamHandlerObject);
                });

                var savedAnnotations = clickedElement.getAnnotationList();
                var annotations = [];
                _.forEach(savedAnnotations, function (savedAnnotation) {
                    annotations.push({annotation: savedAnnotation});
                });

                var queryName = clickedElement.getQueryName();
                var inputElementName = clickedElement.getQueryInput().getFrom();
                var savedGroupByAttributes = clickedElement.getGroupBy();
                var having = clickedElement.getHaving();
                var savedOrderByAttributes = clickedElement.getOrderBy();
                var limit = clickedElement.getLimit();
                var outputRateLimit = clickedElement.getOutputRateLimit();
                var outputElementName = clickedElement.getQueryOutput().getTarget();

                var groupBy = [];
                _.forEach(savedGroupByAttributes, function (savedGroupByAttribute) {
                    var groupByAttributeObject = {
                        attribute: savedGroupByAttribute
                    };
                    groupBy.push(groupByAttributeObject);
                });

                var orderBy = [];
                _.forEach(savedOrderByAttributes, function (savedOrderByValue) {
                    var orderByValueObject = {
                        attribute: savedOrderByValue.getValue(),
                        order: (savedOrderByValue.getOrder()).toLowerCase()
                    };
                    orderBy.push(orderByValueObject);
                });

                var possibleGroupByAttributes = [];
                var inputElementType = undefined;
                var outputElementType = undefined;
                var outputElementAttributesList = [];

                var partitionId;
                var partitionElementWhereQueryIsSaved
                    = self.configurationData.getSiddhiAppConfig().getPartitionWhereQueryIsSaved(id);
                if (partitionElementWhereQueryIsSaved !== undefined) {
                    partitionId = partitionElementWhereQueryIsSaved.getId();
                }

                var inputElement =
                    self.configurationData.getSiddhiAppConfig()
                        .getDefinitionElementByName(inputElementName, partitionId);
                if (inputElement !== undefined) {
                    if (inputElement.type !== undefined
                        && (inputElement.type === 'STREAM' || inputElement.type === 'WINDOW')) {
                        inputElementType = inputElement.type;
                        if (inputElement.element !== undefined) {
                            _.forEach(inputElement.element.getAttributeList(), function (attribute) {
                                possibleGroupByAttributes.push(attribute.getName());
                            });
                        }
                    } else if (inputElement.type !== undefined && (inputElement.type === 'TRIGGER')) {
                        inputElementType = inputElement.type;
                        possibleGroupByAttributes.push('triggered_time');
                    }
                }

                var outputElement =
                    self.configurationData.getSiddhiAppConfig()
                        .getDefinitionElementByName(outputElementName, partitionId);
                if (outputElement !== undefined) {
                    if (outputElement.type !== undefined
                        && (outputElement.type === 'STREAM' || outputElement.type === 'TABLE'
                            || outputElement.type === 'WINDOW')) {
                        outputElementType = outputElement.type;
                        if (outputElement.element !== undefined) {
                            outputElementAttributesList = outputElement.element.getAttributeList();
                        }
                    }
                }

                var select = [];
                var possibleUserDefinedSelectTypeValues = [];
                if (!clickedElement.getSelect()) {
                    for (var i = 0; i < outputElementAttributesList.length; i++) {
                        var attr = {
                            expression: undefined,
                            as: outputElementAttributesList[i].getName()
                        };
                        select.push(attr);
                    }
                } else if (!clickedElement.getSelect().getValue()) {
                    for (var i = 0; i < outputElementAttributesList.length; i++) {
                        var attr = {
                            expression: undefined,
                            as: outputElementAttributesList[i].getName()
                        };
                        select.push(attr);
                    }
                } else if (clickedElement.getSelect().getValue() === '*') {
                    select = '*';
                    for (var i = 0; i < outputElementAttributesList.length; i++) {
                        var attr = {
                            expression: undefined,
                            as: outputElementAttributesList[i].getName()
                        };
                        possibleUserDefinedSelectTypeValues.push(attr);
                    }
                } else if (!(clickedElement.getSelect().getValue() === '*')) {
                    var selectedAttributes = clickedElement.getSelect().getValue();
                    for (var i = 0; i < outputElementAttributesList.length; i++) {
                        var expressionStatement = undefined;
                        if (selectedAttributes[i] !== undefined && selectedAttributes[i].expression !== undefined) {
                            expressionStatement = selectedAttributes[i].expression;
                        }
                        var attr = {
                            expression: expressionStatement,
                            as: outputElementAttributesList[i].getName()
                        };
                        select.push(attr);
                    }
                }

                var savedQueryOutput = clickedElement.getQueryOutput();
                if (savedQueryOutput !== undefined) {
                    var savedQueryOutputTarget = savedQueryOutput.getTarget();
                    var savedQueryOutputType = savedQueryOutput.getType();
                    var output = savedQueryOutput.getOutput();
                    var queryOutput;
                    if ((savedQueryOutputTarget !== undefined)
                        && (savedQueryOutputType !== undefined)
                        && (output !== undefined)) {
                        // getting the event tpe and pre load it
                        var eventType;
                        if (!output.getEventType()) {
                            eventType = 'all events';
                        } else if (output.getEventType() === 'ALL_EVENTS') {
                            eventType = 'all events';
                        } else if (output.getEventType() === 'CURRENT_EVENTS') {
                            eventType = 'current events';
                        } else if (output.getEventType() === 'EXPIRED_EVENTS') {
                            eventType = 'expired events';
                        }
                        if (savedQueryOutputType === "INSERT") {
                            queryOutput = {
                                insertTarget: savedQueryOutputTarget,
                                eventType: eventType
                            };
                        } else if (savedQueryOutputType === "DELETE") {
                            queryOutput = {
                                deleteTarget: savedQueryOutputTarget,
                                eventType: eventType,
                                on: output.getOn()
                            };
                        } else if (savedQueryOutputType === "UPDATE") {
                            queryOutput = {
                                updateTarget: savedQueryOutputTarget,
                                eventType: eventType,
                                set: output.getSet(),
                                on: output.getOn()
                            };
                        } else if (savedQueryOutputType === "UPDATE_OR_INSERT_INTO") {
                            queryOutput = {
                                updateOrInsertIntoTarget: savedQueryOutputTarget,
                                eventType: eventType,
                                set: output.getSet(),
                                on: output.getOn()
                            };
                        }
                    }
                }


                /*
                * Test whether filter, function and window queries has their unique elements. For an example if a filter
                * is added the filter field should be activated. If a window is added window fields should be
                * activated. If a function query is added function related fields should be activated.
                * NOTE: this check is only essential when a form is opened for a query for the first time. After that
                * query type is changed according to the user input. So the required fields are already activated and
                * filled.
                * */
                if ($(element).parent().hasClass(constants.FILTER) && noOfSavedFilters === 0) {
                    var streamHandlerFilterObject = {
                        streamHandler: {
                            filter: ' '
                        }
                    };
                    streamHandlerList.push(streamHandlerFilterObject);

                } else if ($(element).parent().hasClass(constants.WINDOW_QUERY) && noOfSavedWindows === 0) {
                    var streamHandlerWindowObject = {
                        streamHandler: {
                            windowName: ' ',
                            parameters: [{parameter: ' '}]
                        }
                    };
                    streamHandlerList.push(streamHandlerWindowObject);
                } else if ($(element).parent().hasClass(constants.FUNCTION_QUERY) && noOfSavedFunctions === 0) {
                    var streamHandlerFunctionObject = {
                        streamHandler: {
                            functionName: ' ',
                            parameters: [{parameter: ' '}]
                        }
                    };
                    streamHandlerList.push(streamHandlerFunctionObject);

                }

                var savedQueryInput = {
                    input: {
                        from: clickedElement.getQueryInput().getFrom()
                    },
                    streamHandlerList: streamHandlerList
                };

                var inputElementAttributeList;
                var descriptionForFromElement = 'Attributes { ';
                if (inputElementType === 'STREAM' || inputElementType === 'WINDOW') {
                    inputElementAttributeList = (inputElement.element).getAttributeList();
                    _.forEach(inputElementAttributeList, function (attribute) {
                        descriptionForFromElement
                            = descriptionForFromElement + attribute.getName() + ' : ' + attribute.getType() + ', ';
                    });
                    descriptionForFromElement
                        = descriptionForFromElement.substring(0, descriptionForFromElement.length - 2);
                    descriptionForFromElement = descriptionForFromElement + ' }';
                } else if (inputElementType === 'TRIGGER') {
                    descriptionForFromElement = descriptionForFromElement + 'triggered_time : long }';
                }

                var fillQueryInputWith = self.formUtils.cleanJSONObject(savedQueryInput);

                var fillQueryAnnotation = {
                    annotations: annotations
                };
                fillQueryAnnotation = self.formUtils.cleanJSONObject(fillQueryAnnotation);
                var fillQuerySelectWith = {
                    select: select,
                    groupBy: groupBy,
                    postFilter: {
                        having: having
                    }
                };
                fillQuerySelectWith = self.formUtils.cleanJSONObject(fillQuerySelectWith);
                var fillQueryOutputWith = {
                    orderBy: orderBy,
                    limit: {
                        limit: limit
                    },
                    outputRateLimit: {
                        outputRateLimit: outputRateLimit
                    },
                    output: queryOutput
                };
                fillQueryOutputWith = self.formUtils.cleanJSONObject(fillQueryOutputWith);

                var inputSchema;
                if (inputElementType === 'WINDOW') {
                    inputSchema = {
                        type: "object",
                        title: "输入",
                        required: true,
                        options: {
                            disable_properties: false
                        },
                        properties: {
                            input: {
                                propertyOrder: 1,
                                type: "object",
                                title: "输入",
                                required: true,
                                properties: {
                                    from: {
                                        required: true,
                                        title: "窗口",
                                        type: "string",
                                        template: inputElementName,
                                        minLength: 1,
                                        description: descriptionForFromElement
                                    }
                                }
                            },
                            streamHandlerList: {
                                propertyOrder: 2,
                                type: "array",
                                format: "table",
                                title: "流处理器",
                                minItems: 1,
                                items: {
                                    type: "object",
                                    title: '流处理器',
                                    properties: {
                                        streamHandler: {
                                            required: true,
                                            title: '流处理器',
                                            oneOf: [
                                                {
                                                    $ref: "#/definitions/filter",
                                                    title: "过滤"
                                                },
                                                {
                                                    $ref: "#/definitions/functionDef",
                                                    title: "函数"
                                                }
                                            ]
                                        }
                                    }
                                }
                            }
                        },
                        definitions: {
                            filter: {
                                type: "object",
                                title: "过滤",
                                required: true,
                                properties: {
                                    filter: {
                                        required: true,
                                        title: "过滤条件",
                                        type: "string",
                                        minLength: 1
                                    }
                                }
                            },
                            functionDef: {
                                title: "函数",
                                type: "object",
                                required: true,
                                options: {
                                    disable_properties: false
                                },
                                properties: {
                                    functionName: {
                                        required: true,
                                        title: "函数名",
                                        type: "string",
                                        minLength: 1
                                    },
                                    parameters: {
                                        type: "array",
                                        format: "table",
                                        title: "参数",
                                        minItems: 1,
                                        items: {
                                            type: "object",
                                            title: '属性',
                                            properties: {
                                                parameter: {
                                                    required: true,
                                                    type: 'string',
                                                    title: '参数名',
                                                    minLength: 1
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else {
                    inputSchema = {
                        type: "object",
                        title: "输入",
                        required: true,
                        options: {
                            disable_properties: false
                        },
                        properties: {
                            input: {
                                propertyOrder: 1,
                                type: "object",
                                title: "输入",
                                required: true,
                                properties: {
                                    from: {
                                        required: true,
                                        title: "流/触发器",
                                        type: "string",
                                        template: inputElementName,
                                        minLength: 1,
                                        description: descriptionForFromElement
                                    }
                                }
                            },
                            streamHandlerList: {
                                propertyOrder: 2,
                                type: "array",
                                format: "table",
                                title: "流处理器",
                                minItems: 1,
                                items: {
                                    type: "object",
                                    title: '流处理器',
                                    properties: {
                                        streamHandler: {
                                            title: '流处理器',
                                            required: true,
                                            oneOf: [
                                                {
                                                    $ref: "#/definitions/filter",
                                                    title: "过滤"
                                                },
                                                {
                                                    $ref: "#/definitions/functionDef",
                                                    title: "函数"
                                                },
                                                {
                                                    $ref: "#/definitions/window",
                                                    title: "窗口"
                                                }
                                            ]
                                        }
                                    }
                                }
                            }
                        },
                        definitions: {
                            filter: {
                                type: "object",
                                title: "过滤",
                                required: true,
                                properties: {
                                    filter: {
                                        required: true,
                                        title: "过滤条件",
                                        type: "string",
                                        minLength: 1
                                    }
                                }
                            },
                            window: {
                                title: "窗口",
                                type: "object",
                                required: true,
                                options: {
                                    disable_properties: false
                                },
                                properties: {
                                    windowName: {
                                        required: true,
                                        title: "窗口名称",
                                        type: "string",
                                        minLength: 1
                                    },
                                    parameters: {
                                        type: "array",
                                        format: "table",
                                        title: "参数",
                                        minItems: 1,
                                        items: {
                                            type: "object",
                                            title: '属性',
                                            properties: {
                                                parameter: {
                                                    required: true,
                                                    type: 'string',
                                                    title: '参数名',
                                                    minLength: 1
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            functionDef: {
                                title: "函数",
                                type: "object",
                                required: true,
                                options: {
                                    disable_properties: false
                                },
                                properties: {
                                    functionName: {
                                        required: true,
                                        title: "函数名",
                                        type: "string",
                                        minLength: 1
                                    },
                                    parameters: {
                                        type: "array",
                                        format: "table",
                                        title: "参数",
                                        minItems: 1,
                                        items: {
                                            type: "object",
                                            title: '属性',
                                            properties: {
                                                parameter: {
                                                    required: true,
                                                    type: 'string',
                                                    title: '参数名',
                                                    minLength: 1
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    };
                }
                var outputSchema;
                if (outputElementType === 'TABLE') {
                    outputSchema = {
                        title: "动作",
                        propertyOrder: 5,
                        required: true,
                        oneOf: [
                            {
                                $ref: "#/definitions/queryOutputInsertType",
                                title: "插入"
                            },
                            {
                                $ref: "#/definitions/queryOutputDeleteType",
                                title: "删除"
                            },
                            {
                                $ref: "#/definitions/queryOutputUpdateType",
                                title: "更新"
                            },
                            {
                                $ref: "#/definitions/queryOutputUpdateOrInsertIntoType",
                                title: "更新或插入"
                            }
                        ]
                    };
                } else {
                    outputSchema = {
                        required: true,
                        title: "动作",
                        propertyOrder: 5,
                        type: "object",
                        properties: {
                            insert: {
                                required: true,
                                title: "操作",
                                type: "string",
                                template: "Insert"
                            },
                            insertTarget: {
                                type: 'string',
                                title: '目标',
                                template: savedQueryOutputTarget,
                                required: true
                            },
                            eventType: {
                                required: true,
                                title: "事件类型",
                                type: "string",
                                enum: ['current events', 'expired events', 'all events'],
                                default: 'current events'
                            }
                        }
                    };
                }

                formContainer.find('.define-windowFilterProjection-query')
                    .append('<div class="col-md-12 section-seperator frm-qry"><div class="col-md-4">' +
                    '<div class="row"><div id="form-query-name"></div>'+
                    '<div id="form-query-annotation" class="col-md-12 section-seperator"></div></div>' +
                    '<div class="row"><div id="form-query-input" class="col-md-12"></div></div></div>' +
                    '<div id="form-query-select" class="col-md-4"></div>' +
                    '<div id="form-query-output" class="col-md-4"></div></div>');

                var editorAnnotation = new JSONEditor($(formContainer).find('#form-query-annotation')[0], {
                    schema: {
                        type: "object",
                        title: "注解",
                        properties: {
                            annotations: {
                                propertyOrder: 1,
                                type: "array",
                                format: "table",
                                title: "添加注解",
                                uniqueItems: true,
                                minItems: 1,
                                items: {
                                    type: "object",
                                    title: "注解",
                                    options: {
                                        disable_properties: true
                                    },
                                    properties: {
                                        annotation: {
                                            title: "注解",
                                            type: "string",
                                            minLength: 1
                                        }
                                    }
                                }
                            }
                        }
                    },
                    startval: fillQueryAnnotation,
                    show_errors: "always",
                    display_required_only: true,
                    no_additional_properties: true,
                    disable_array_delete_all_rows: true,
                    disable_array_delete_last_row: true
                });

                var editorQueryName = new JSONEditor($(formContainer).find('#form-query-name')[0], {
                schema: {
                       required: true,
                       title: "名称",
                       type: "string",
                       default: "query"
                },
                startval: queryName,
                show_errors: "always"
                });

                var editorInput = new JSONEditor($(formContainer).find('#form-query-input')[0], {
                    schema: inputSchema,
                    startval: fillQueryInputWith,
                    show_errors: "always",
                    disable_properties: true,
                    display_required_only: true,
                    no_additional_properties: true,
                    disable_array_delete_all_rows: true,
                    disable_array_delete_last_row: true,
                    disable_array_reorder: false
                });
                var selectScheme = {
                    schema: {
                        required: true,
                        options: {
                            disable_properties: false
                        },
                        type: "object",
                        title: "选择",
                        properties: {
                            select: {
                                propertyOrder: 1,
                                title: "选择",
                                required: true,
                                oneOf: [
                                    {
                                        $ref: "#/definitions/querySelectUserDefined",
                                        title: "用户定义属性"
                                    },
                                    {
                                        $ref: "#/definitions/querySelectAll",
                                        title: "全部属性"
                                    }
                                ]
                            },
                            groupBy: {
                                propertyOrder: 2,
                                type: "array",
                                format: "table",
                                title: "分组属性",
                                uniqueItems: true,
                                minItems: 1,
                                items: {
                                    type: "object",
                                    title: '属性',
                                    properties: {
                                        attribute: {
                                            type: 'string',
                                            title: '属性名',
                                            enum: possibleGroupByAttributes
                                        }
                                    }
                                }
                            },
                            postFilter: {
                                propertyOrder: 3,
                                type: "object",
                                title: "选择过滤",
                                properties: {
                                    having: {
                                        required: true,
                                        title: "条件",
                                        type: "string",
                                        minLength: 1
                                    }
                                }
                            }
                        },
                        definitions: {
                            querySelectUserDefined: {
                                required: true,
                                type: "array",
                                format: "table",
                                title: "选择属性",
                                uniqueItems: true,
                                options: {
                                    disable_array_add: true,
                                    disable_array_delete: true
                                },
                                items: {
                                    title: "值集合",
                                    type: "object",
                                    properties: {
                                        expression: {
                                            title: "表达式",
                                            type: "string",
                                            minLength: 1
                                        },
                                        as: {
                                            title: "别名",
                                            type: "string"
                                        }
                                    }
                                }
                            },
                            querySelectAll: {
                                type: "string",
                                title: "选择全部属性",
                                template: '*'
                            }
                        }
                    },
                    startval: fillQuerySelectWith,
                    show_errors: "always",
                    disable_properties: true,
                    display_required_only: true,
                    no_additional_properties: true,
                    disable_array_delete_all_rows: true,
                    disable_array_delete_last_row: true,
                    disable_array_reorder: true
                };
                var editorSelect = new JSONEditor($(formContainer).find('#form-query-select')[0], selectScheme);
                var selectNode = editorSelect.getEditor('root.select');
                //disable fields that can not be changed
                if (!(selectNode.getValue() === "*")) {
                    for (var i = 0; i < outputElementAttributesList.length; i++) {
                        editorSelect.getEditor('root.select.' + i + '.as').disable();
                    }
                }

                editorSelect.watch('root.select', function () {
                    var oldSelectValue = editorSelect.getValue().select;
                    var newSelectValue = selectNode.getValue();
                    if (oldSelectValue === "*" && newSelectValue !== "*") {
                        if (select === "*") {
                            fillQuerySelectWith = {
                                select: possibleUserDefinedSelectTypeValues,
                                groupBy: editorSelect.getValue().groupBy,
                                postFilter: editorSelect.getValue().postFilter
                            };
                        } else {
                            fillQuerySelectWith = {
                                select: select,
                                groupBy: editorSelect.getValue().groupBy,
                                postFilter: editorSelect.getValue().postFilter
                            };
                        }
                        fillQuerySelectWith = self.formUtils.cleanJSONObject(fillQuerySelectWith);
                        selectScheme.startval = fillQuerySelectWith;
                        $(formContainer).find('#form-query-select').empty();
                        editorSelect = new JSONEditor($(formContainer).find('#form-query-select')[0], selectScheme);
                        //disable fields that can not be changed
                        for (var i = 0; i < outputElementAttributesList.length; i++) {
                            editorSelect.getEditor('root.select.' + i + '.as').disable();
                        }
                    }
                });

                var editorOutput = new JSONEditor($(formContainer).find('#form-query-output')[0], {
                    schema: {
                        required: true,
                        type: "object",
                        title: "输出",
                        options: {
                            disable_properties: false
                        },
                        properties: {
                            orderBy: {
                                propertyOrder: 2,
                                type: "array",
                                format: "table",
                                title: "排序属性",
                                uniqueItems: true,
                                minItems: 1,
                                items: {
                                    type: "object",
                                    title: '属性',
                                    properties: {
                                        attribute: {
                                            required: true,
                                            type: 'string',
                                            title: '属性名',
                                            enum: possibleGroupByAttributes
                                        },
                                        order: {
                                            required: true,
                                            type: "string",
                                            title: "顺序",
                                            enum: ['asc', 'desc'],
                                            default: 'asc'
                                        }
                                    }
                                }
                            },
                            limit: {
                                propertyOrder: 3,
                                type: "object",
                                title: "限制",
                                properties: {
                                    limit: {
                                        required: true,
                                        title: "每个输出的事件个数",
                                        type: "number",
                                        minimum: 0
                                    }
                                }
                            },
                            outputRateLimit: {
                                propertyOrder: 4,
                                type: "object",
                                title: "比率限制",
                                properties: {
                                    outputRateLimit: {
                                        required: true,
                                        title: "基于事件/时间/快照",
                                        type: "string",
                                        minLength: 1
                                    }
                                }
                            },
                            output: outputSchema
                        },
                        definitions: {
                            queryOutputInsertType: {
                                required: true,
                                title: "动作",
                                type: "object",
                                options: {
                                    disable_properties: true
                                },
                                properties: {
                                    insertTarget: {
                                        type: 'string',
                                        title: '目标',
                                        template: savedQueryOutputTarget,
                                        required: true
                                    },
                                    eventType: {
                                        required: true,
                                        title: "事件类型",
                                        type: "string",
                                        enum: ['current events', 'expired events', 'all events'],
                                        default: 'all events'
                                    }
                                }
                            },
                            queryOutputDeleteType: {
                                required: true,
                                title: "动作",
                                type: "object",
                                options: {
                                    disable_properties: true
                                },
                                properties: {
                                    deleteTarget: {
                                        type: 'string',
                                        title: '目标',
                                        template: savedQueryOutputTarget,
                                        required: true
                                    },
                                    eventType: {
                                        title: "事件类型",
                                        type: "string",
                                        enum: ['current events', 'expired events', 'all events'],
                                        default: 'all events',
                                        required: true
                                    },
                                    on: {
                                        type: 'string',
                                        title: '条件',
                                        minLength: 1,
                                        required: true
                                    }
                                }
                            },
                            queryOutputUpdateType: {
                                required: true,
                                title: "动作",
                                type: "object",
                                options: {
                                    disable_properties: true
                                },
                                properties: {
                                    updateTarget: {
                                        type: 'string',
                                        title: '目标',
                                        template: savedQueryOutputTarget,
                                        required: true
                                    },
                                    eventType: {
                                        title: "事件类型",
                                        type: "string",
                                        enum: ['current events', 'expired events', 'all events'],
                                        default: 'all events',
                                        required: true
                                    },
                                    set: {
                                        required: true,
                                        type: "array",
                                        format: "table",
                                        title: "设置",
                                        uniqueItems: true,
                                        items: {
                                            type: "object",
                                            title: '设置条件',
                                            properties: {
                                                attribute: {
                                                    type: "string",
                                                    title: '属性',
                                                    minLength: 1
                                                },
                                                value: {
                                                    type: "string",
                                                    title: '值',
                                                    minLength: 1
                                                }
                                            }
                                        }
                                    },
                                    on: {
                                        type: 'string',
                                        title: '条件',
                                        minLength: 1,
                                        required: true
                                    }
                                }
                            },
                            queryOutputUpdateOrInsertIntoType: {
                                required: true,
                                title: "动作",
                                type: "object",
                                options: {
                                    disable_properties: true
                                },
                                properties: {
                                    updateOrInsertIntoTarget: {
                                        type: 'string',
                                        title: '目标',
                                        template: savedQueryOutputTarget,
                                        required: true
                                    },
                                    eventType: {
                                        title: "事件类型",
                                        type: "string",
                                        enum: ['current events', 'expired events', 'all events'],
                                        default: 'all events',
                                        required: true
                                    },
                                    set: {
                                        required: true,
                                        type: "array",
                                        format: "table",
                                        title: "设置",
                                        uniqueItems: true,
                                        items: {
                                            type: "object",
                                            title: '设置条件',
                                            properties: {
                                                attribute: {
                                                    type: "string",
                                                    title: '属性',
                                                    minLength: 1
                                                },
                                                value: {
                                                    type: "string",
                                                    title: '值',
                                                    minLength: 1
                                                }
                                            }
                                        }
                                    },
                                    on: {
                                        type: 'string',
                                        title: '条件',
                                        minLength: 1,
                                        required: true
                                    }
                                }

                            }

                        }
                    },
                    startval: fillQueryOutputWith,
                    show_errors: "always",
                    disable_properties: true,
                    display_required_only: true,
                    no_additional_properties: true,
                    disable_array_delete_all_rows: true,
                    disable_array_delete_last_row: true,
                    disable_array_reorder: true
                });

                formContainer.append(self.formUtils.buildFormButtons(true));

                // 'Submit' button action
                var submitButtonElement = $(formContainer).find('#btn-submit')[0];
                submitButtonElement.addEventListener('click', function () {

                    var annotationErrors = editorAnnotation.validate();
                    var inputErrors = editorInput.validate();
                    var selectErrors = editorSelect.validate();
                    var outputErrors = editorOutput.validate();
                    if (annotationErrors.length || inputErrors.length || selectErrors.length || outputErrors.length) {
                        return;
                    }

                    // set the isDesignViewContentChanged to true
                    self.configurationData.setIsDesignViewContentChanged(true);

                    var annotationConfig = editorAnnotation.getValue();
                    var queryNameConfig = editorQueryName.getValue();
                    var inputConfig = editorInput.getValue();
                    var selectConfig = editorSelect.getValue();
                    var outputConfig = editorOutput.getValue();

                    var numberOfWindows = 0;
                    var numberOfFilters = 0;
                    var numberOfFunctions = 0;

                    var isQueryNameUsed
                        = self.formUtils.isQueryDefinitionNameUsed(queryNameConfig, clickedElement.getId());
                    if (isQueryNameUsed) {
                           DesignViewUtils.prototype.errorAlert("查询名称 \"" + queryNameConfig + "\" 已被使用.");
                        return;
                    }

                    clickedElement.getQueryInput().clearStreamHandlerList();
                    clickedElement.addQueryName(queryNameConfig);

                    _.forEach(inputConfig.streamHandlerList, function (streamHandler) {
                        streamHandler = streamHandler.streamHandler;
                        var streamHandlerOptions = {};
                        if (streamHandler.windowName !== undefined) {
                            numberOfWindows++;
                            var windowOptions = {};
                            _.set(windowOptions, 'function', streamHandler.windowName);
                            var parameters = [];
                            _.forEach(streamHandler.parameters, function (parameter) {
                                parameters.push(parameter.parameter);
                            });
                            _.set(windowOptions, 'parameters', parameters);
                            var queryWindow = new QueryWindowOrFunction(windowOptions);
                            _.set(streamHandlerOptions, 'type', 'WINDOW');
                            _.set(streamHandlerOptions, 'value', queryWindow);
                        } else if (streamHandler.functionName !== undefined) {
                            numberOfFunctions++;
                            var functionOptions = {};
                            _.set(functionOptions, 'function', streamHandler.functionName);
                            var parameters = [];
                            _.forEach(streamHandler.parameters, function (parameter) {
                                parameters.push(parameter.parameter);
                            });
                            _.set(functionOptions, 'parameters', parameters);
                            var queryFunction = new QueryWindowOrFunction(functionOptions);
                            _.set(streamHandlerOptions, 'type', 'FUNCTION');
                            _.set(streamHandlerOptions, 'value', queryFunction);
                        } else if (streamHandler.filter !== undefined) {
                            numberOfFilters++;
                            _.set(streamHandlerOptions, 'type', 'FILTER');
                            _.set(streamHandlerOptions, 'value', streamHandler.filter);
                        } else {
                            console.log("Unknown stream handler received!");
                        }
                        var streamHandlerObject = new StreamHandler(streamHandlerOptions);
                        clickedElement.getQueryInput().addStreamHandler(streamHandlerObject);
                    });

                    if (numberOfWindows > 1) {
                        DesignViewUtils.prototype.errorAlert('只能定义一个窗口!');
                        return;
                    }
                    clickedElement.clearAnnotationList();
                    _.forEach(annotationConfig.annotations, function (annotation) {
                        clickedElement.addAnnotation(annotation.annotation);
                    });

                    var type;
                    // change the query icon depending on the fields filled
                    if (numberOfFunctions > 0) {
                        type = "FUNCTION";
                        $(element).parent().removeClass();
                        $(element).parent().addClass(constants.FUNCTION_QUERY + ' jtk-draggable');
                    } else if (numberOfWindows === 1) {
                        type = "WINDOW";
                        $(element).parent().removeClass();
                        $(element).parent().addClass(constants.WINDOW_QUERY + ' jtk-draggable');
                    } else if (numberOfFilters > 0) {
                        type = "FILTER";
                        $(element).parent().removeClass();
                        $(element).parent().addClass(constants.FILTER + ' jtk-draggable');
                    } else {
                        type = "PROJECTION";
                        $(element).parent().removeClass();
                        $(element).parent().addClass(constants.PROJECTION + ' jtk-draggable');
                    }

                    var queryInput = clickedElement.getQueryInput();
                    queryInput.setType(type);

                    var selectAttributeOptions = {};
                    if (selectConfig.select instanceof Array) {
                        _.set(selectAttributeOptions, 'type', 'USER_DEFINED');
                        _.set(selectAttributeOptions, 'value', selectConfig.select);
                    } else if (selectConfig.select === "*") {
                        _.set(selectAttributeOptions, 'type', 'ALL');
                        _.set(selectAttributeOptions, 'value', selectConfig.select);
                    } else {
                        console.log("Value other than \"USER_DEFINED\" and \"ALL\" received!");
                    }
                    var selectObject = new QuerySelect(selectAttributeOptions);
                    clickedElement.setSelect(selectObject);

                    if (selectConfig.groupBy !== undefined) {
                        var groupByAttributes = [];
                        _.forEach(selectConfig.groupBy, function (groupByAttribute) {
                            groupByAttributes.push(groupByAttribute.attribute);
                        });
                        clickedElement.setGroupBy(groupByAttributes);
                    } else {
                        clickedElement.setGroupBy(undefined);
                    }

                    if (selectConfig.postFilter !== undefined && selectConfig.postFilter.having !== undefined) {
                        clickedElement.setHaving(selectConfig.postFilter.having);
                    } else {
                        clickedElement.setHaving(undefined);
                    }

                    clickedElement.clearOrderByValueList();
                    if (outputConfig.orderBy !== undefined) {
                        _.forEach(outputConfig.orderBy, function (orderByValue) {
                            var orderByValueObjectOptions = {};
                            _.set(orderByValueObjectOptions, 'value', orderByValue.attribute);
                            _.set(orderByValueObjectOptions, 'order', (orderByValue.order).toUpperCase());
                            var orderByValueObject = new QueryOrderByValue(orderByValueObjectOptions);
                            clickedElement.addOrderByValue(orderByValueObject);
                        });
                    }

                    if (outputConfig.limit !== undefined && outputConfig.limit.limit !== undefined) {
                        clickedElement.setLimit(outputConfig.limit.limit);
                    } else {
                        clickedElement.setLimit(undefined);
                    }

                    if (outputConfig.outputRateLimit !== undefined
                        && outputConfig.outputRateLimit.outputRateLimit !== undefined) {
                        clickedElement.setOutputRateLimit(outputConfig.outputRateLimit.outputRateLimit);
                    } else {
                        clickedElement.setOutputRateLimit(undefined);
                    }

                    // update name of the query related to the element if the name is changed
                    if (queryName !== queryNameConfig) {
                        // update selected query
                        clickedElement.addQueryName(queryNameConfig);
                        if (queryNameConfig == "") {
                             queryNameConfig = "Query";
                        }
                        var textNode = $('#' + clickedElement.getId()).find('.queryNameNode');
                        textNode.html(queryNameConfig);
                    }

                    var queryOutput = clickedElement.getQueryOutput();
                    var outputObject;
                    var outputType;
                    var outputTarget;
                    if (outputConfig.output !== undefined) {
                        if (outputConfig.output.insertTarget !== undefined) {
                            outputType = "INSERT";
                            outputTarget = outputConfig.output.insertTarget;
                            outputObject = new QueryOutputInsert(outputConfig.output);
                        } else if (outputConfig.output.deleteTarget !== undefined) {
                            outputType = "DELETE";
                            outputTarget = outputConfig.output.deleteTarget;
                            outputObject = new QueryOutputDelete(outputConfig.output);
                        } else if (outputConfig.output.updateTarget !== undefined) {
                            outputType = "UPDATE";
                            outputTarget = outputConfig.output.updateTarget;
                            outputObject = new QueryOutputUpdate(outputConfig.output);
                        } else if (outputConfig.output.updateOrInsertIntoTarget !== undefined) {
                            outputType = "UPDATE_OR_INSERT_INTO";
                            outputTarget = outputConfig.output.updateOrInsertIntoTarget;
                            outputObject = new QueryOutputUpdateOrInsertInto(outputConfig.output);
                        } else {
                            console.log("Invalid output type for query received!")
                        }

                        if (!outputConfig.output.eventType) {
                            outputObject.setEventType(undefined);
                        } else if (outputConfig.output.eventType === "all events") {
                            outputObject.setEventType('ALL_EVENTS');
                        } else if (outputConfig.output.eventType === "current events") {
                            outputObject.setEventType('CURRENT_EVENTS');
                        } else if (outputConfig.output.eventType === "expired events") {
                            outputObject.setEventType('EXPIRED_EVENTS');
                        }
                        queryOutput.setTarget(outputTarget);
                        queryOutput.setOutput(outputObject);
                        queryOutput.setType(outputType);
                    }

                    // perform JSON validation
                    JSONValidator.prototype.validateWindowFilterProjectionQuery(clickedElement);

                    self.designViewContainer.removeClass('disableContainer');
                    self.toggleViewButton.removeClass('disableContainer');

                    // close the form window
                    self.consoleListManager.removeFormConsole(formConsole);
                });

                // 'Cancel' button action
                var cancelButtonElement = $(formContainer).find('#btn-cancel')[0];
                cancelButtonElement.addEventListener('click', function () {
                    self.designViewContainer.removeClass('disableContainer');
                    self.toggleViewButton.removeClass('disableContainer');
                    // close the form window
                    self.consoleListManager.removeFormConsole(formConsole);
                });
            }
        };

        return WindowFilterProjectionQueryForm;
    });
