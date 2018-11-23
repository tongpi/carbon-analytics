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
        'queryOutputUpdate', 'queryOutputUpdateOrInsertInto', 'queryOrderByValue',
        'patternOrSequenceQueryCondition', 'streamHandler', 'queryWindowOrFunction', 'designViewUtils',
        'jsonValidator'],
    function (require, log, $, _, QuerySelect, QueryOutputInsert, QueryOutputDelete, QueryOutputUpdate,
              QueryOutputUpdateOrInsertInto, QueryOrderByValue, PatternOrSequenceQueryCondition, StreamHandler,
              QueryWindowOrFunction, DesignViewUtils, JSONValidator) {

        /**
         * @class SequenceQueryForm Creates a forms to collect data from a sequence query
         * @constructor
         * @param {Object} options Rendering options for the view
         */
        var SequenceQueryForm = function (options) {
            if (options !== undefined) {
                this.configurationData = options.configurationData;
                this.application = options.application;
                this.formUtils = options.formUtils;
                this.consoleListManager = options.application.outputController;
                this.currentTabId = this.application.tabController.activeTab.cid;
                this.designViewContainer = $('#design-container-' + this.currentTabId);
                this.toggleViewButton = $('#toggle-view-button-' + this.currentTabId);
            }
        };

        /**
         * @function generate the form for the sequence query
         * @param element selected element(query)
         * @param formConsole Console which holds the form
         * @param formContainer Container which holds the form
         */
        SequenceQueryForm.prototype.generatePropertiesForm = function (element, formConsole, formContainer) {
            var self = this;
            var propertyDiv = $('<div id="property-header"><h3>序列查询配置</h3></div>' +
                '<div class="define-sequence-query"></div>');
            formContainer.append(propertyDiv);
            self.designViewContainer.addClass('disableContainer');
            self.toggleViewButton.addClass('disableContainer');

            var id = $(element).parent().attr('id');
            var clickedElement = self.configurationData.getSiddhiAppConfig().getSequenceQuery(id);
            if (!clickedElement.getQueryInput()
                || clickedElement.getQueryInput().getConnectedElementNameList().length === 0) {
                DesignViewUtils.prototype.warnAlert('连接输入流');
                self.designViewContainer.removeClass('disableContainer');
                self.toggleViewButton.removeClass('disableContainer');

                // close the form window
                self.consoleListManager.removeFormConsole(formConsole);
            } else if (!clickedElement.getQueryOutput() || !clickedElement.getQueryOutput().getTarget()) {
                DesignViewUtils.prototype.warnAlert('连接一个输出元素');
                self.designViewContainer.removeClass('disableContainer');
                self.toggleViewButton.removeClass('disableContainer');

                // close the form window
                self.consoleListManager.removeFormConsole(formConsole);
            } else {

                var savedAnnotations = clickedElement.getAnnotationList();
                var annotations = [];
                _.forEach(savedAnnotations, function (savedAnnotation) {
                    annotations.push({annotation: savedAnnotation});
                });

                var queryName = clickedElement.getQueryName();
                var inputStreamNames = clickedElement.getQueryInput().getConnectedElementNameList();
                var savedConditionList = clickedElement.getQueryInput().getConditionList();
                var logic = clickedElement.getQueryInput().getLogic();
                var savedGroupByAttributes = clickedElement.getGroupBy();
                var having = clickedElement.getHaving();
                var savedOrderByAttributes = clickedElement.getOrderBy();
                var limit = clickedElement.getLimit();
                var outputRateLimit = clickedElement.getOutputRateLimit();
                var outputElementName = clickedElement.getQueryOutput().getTarget();

                var conditionList = [];
                _.forEach(savedConditionList, function (savedCondition) {
                    var streamHandlerList = [];
                    _.forEach(savedCondition.getStreamHandlerList(), function (streamHandler) {
                        var streamHandlerObject;
                        var parameters = [];
                        if (streamHandler.getType() === "FILTER") {
                            streamHandlerObject = {
                                streamHandler: {
                                    filter: streamHandler.getValue()
                                }
                            };
                        } else if (streamHandler.getType() === "FUNCTION") {
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
                        }
                        streamHandlerList.push(streamHandlerObject);
                    });

                    var conditionObject = {
                        conditionId: savedCondition.getConditionId(),
                        streamName: savedCondition.getStreamName(),
                        streamHandlerList: streamHandlerList
                    };
                    conditionList.push(conditionObject);
                });

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
                var outputElementType;
                var outputElementAttributesList = [];

                var partitionId;
                var partitionElementWhereQueryIsSaved
                    = self.configurationData.getSiddhiAppConfig().getPartitionWhereQueryIsSaved(id);
                if (partitionElementWhereQueryIsSaved !== undefined) {
                    partitionId = partitionElementWhereQueryIsSaved.getId();
                }

                // build attribute description for connected  streams and triggers to show as the description for the
                // query input
                var descriptionForInputElements = '<br/>';

                _.forEach(inputStreamNames, function (inputStreamName) {
                    var inputElement =
                        self.configurationData.getSiddhiAppConfig()
                            .getDefinitionElementByName(inputStreamName, partitionId);
                    if (inputElement !== undefined) {
                        if (inputElement.type === 'TRIGGER') {
                            possibleGroupByAttributes.push(inputStreamName + '.triggered_time');

                            descriptionForInputElements
                                = descriptionForInputElements + inputStreamName + ' (triggered_time : LONG)<br/>  ';
                        } else {
                            descriptionForInputElements
                                = descriptionForInputElements + inputStreamName + ' (';

                            _.forEach(inputElement.element.getAttributeList(), function (attribute) {
                                possibleGroupByAttributes.push(inputStreamName + "." + attribute.getName());

                                descriptionForInputElements
                                    = descriptionForInputElements + attribute.getName() + ' : ' + attribute.getType() + ', ';
                            });

                            descriptionForInputElements
                                = descriptionForInputElements.substring(0, descriptionForInputElements.length - 2);
                            descriptionForInputElements
                                = descriptionForInputElements + ')<br/>  ';
                        }
                    }
                });

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
                        var expressionStatement;
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

                var fillQueryAnnotation = {
                    annotations: annotations
                };
                fillQueryAnnotation = self.formUtils.cleanJSONObject(fillQueryAnnotation);
                var fillQueryInputWith = {
                    conditions: conditionList,
                    logic: {
                        statement: logic
                    }
                };
                fillQueryInputWith = self.formUtils.cleanJSONObject(fillQueryInputWith);
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

                formContainer.find('.define-sequence-query')
                    .append('<div class="col-md-12 section-seperator frm-qry"><div class="col-md-4">' +
                    '<div class="row"><div id="form-query-name"></div>'+
                    '<div class="row"><div id="form-query-annotation" class="col-md-12 section-seperator"></div></div>' +
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
                    schema: {
                        type: 'object',
                        title: '输入',
                        description: descriptionForInputElements,
                        properties: {
                            conditions: {
                                type: 'array',
                                title: '条件',
                                format: 'tabs',
                                uniqueItems: true,
                                required: true,
                                minItems: 1,
                                propertyOrder: 1,
                                items: {
                                    type: 'object',
                                    options: {
                                        disable_properties: false
                                    },
                                    title: '条件',
                                    headerTemplate: "c" + "{{i1}}",
                                    properties: {
                                        conditionId: {
                                            type: 'string',
                                            title: '条件 ID',
                                            required: true,
                                            minLength: 1,
                                            propertyOrder: 1
                                        },
                                        streamName: {
                                            type: 'string',
                                            title: '流',
                                            enum: inputStreamNames,
                                            required: true,
                                            propertyOrder: 2
                                        },
                                        streamHandlerList: {
                                            propertyOrder: 3,
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
                                                        title: "流处理器",
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
                                    }
                                }
                            },
                            logic: {
                                type: 'object',
                                title: '逻辑',
                                required: true,
                                propertyOrder: 2,
                                properties: {
                                    statement: {
                                        type: 'string',
                                        title: '语句',
                                        minLength: 1,
                                        required: true
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
                                        title: "函数名称",
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
                                                    title: '参数名称',
                                                    minLength: 1
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    startval: fillQueryInputWith,
                    show_errors: "always",
                    disable_properties: true,
                    display_required_only: true,
                    no_additional_properties: true,
                    disable_array_delete_all_rows: true,
                    disable_array_delete_last_row: true,
                    disable_array_reorder: true
                });

                $('#' + self.currentTabId + '[data-schemapath="root"] >  p:eq(0)').html(descriptionForInputElements);

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
                                        title: "用户定义的属性"
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

                    var isQueryNameUsed
                        = self.formUtils.isQueryDefinitionNameUsed(queryNameConfig, clickedElement.getId());
                    if (isQueryNameUsed) {
                           DesignViewUtils.prototype.errorAlert("查询名称 \"" + queryNameConfig + "\" 已被使用.");
                        return;
                    }

                    clickedElement.clearAnnotationList();
                    _.forEach(annotationConfig.annotations, function (annotation) {
                        clickedElement.addAnnotation(annotation.annotation);
                    });

                    var queryInput = clickedElement.getQueryInput();

                    clickedElement.addQueryName(queryNameConfig);

                    queryInput.clearConditionList();
                    _.forEach(inputConfig.conditions, function (condition) {
                        var conditionObjectOptions = {};
                        _.set(conditionObjectOptions, 'conditionId', condition.conditionId);
                        _.set(conditionObjectOptions, 'streamName', condition.streamName);

                        var streamHandlers = [];

                        _.forEach(condition.streamHandlerList, function (streamHandler) {
                            streamHandler = streamHandler.streamHandler;
                            var streamHandlerOptions = {};
                            if (streamHandler.functionName !== undefined) {
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
                                _.set(streamHandlerOptions, 'type', 'FILTER');
                                _.set(streamHandlerOptions, 'value', streamHandler.filter);
                            } else {
                                console.log("Unknown stream handler received!");
                            }
                            var streamHandlerObject = new StreamHandler(streamHandlerOptions);
                            streamHandlers.push(streamHandlerObject);
                        });
                        var conditionObject = new PatternOrSequenceQueryCondition(conditionObjectOptions);
                        conditionObject.setStreamHandlerList(streamHandlers);
                        queryInput.addCondition(conditionObject);
                    });

                    if (inputConfig.logic !== undefined && inputConfig.logic.statement !== undefined) {
                        queryInput.setLogic(inputConfig.logic.statement);
                    } else {
                        queryInput.setLogic(undefined);
                    }

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
                            queryNameConfig = "Sequence Query";
                        }
                        var textNode = $('#' + clickedElement.getId()).find('.sequenceQueryNameNode');
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
                    JSONValidator.prototype.validatePatternOrSequenceQuery(clickedElement, 'Sequence Query');

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

        return SequenceQueryForm;
    });
