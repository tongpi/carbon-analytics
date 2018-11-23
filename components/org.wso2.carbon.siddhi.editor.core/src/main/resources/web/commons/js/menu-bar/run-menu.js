/**
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

define(([],function (){
    var RunMenu = {
        id: "run",
        label: "运行",
        items: [
            {
                id: "run",
                label: "运行",
                command: {
                    id: "run",
                    shortcuts: {
                        mac: {
                            key: "command+r",
                            label: "\u2318R"
                        },
                        other: {
                            key: "ctrl+r",
                            label: "Ctrl+R"
                        }
                    }
                },
                disabled: true
            },
             {
                 id: "debug",
                 label: "调试",
                 command: {
                     id: "debug",
                     shortcuts: {
                         mac: {
                             key: "command+shift+d",
                             label: "\u2318\u21E7D"
                         },
                         other: {
                             key: "ctrl+shift+d",
                             label: "Ctrl+Shift+D"
                         }
                     }
                 },
                 disabled: true
             },
            {
               id: "stop",
               label: "停止",
               command: {
                   id: "stop",
                   shortcuts: {
                       mac: {
                           key: "command+p",
                           label: "\u2318P"
                       },
                       other: {
                           key: "ctrl+p",
                           label: "Ctrl+P"
                       }
                   }
               },
               disabled: true
           }

        ]

    };

    return RunMenu;
}));