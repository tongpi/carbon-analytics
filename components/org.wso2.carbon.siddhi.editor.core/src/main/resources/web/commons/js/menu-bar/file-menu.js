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
    var FileMenu = {
        id: "file",
        label: "文件",
        items: [
            {
                id: "new",
                label: "新建",
                command: {
                    id: "create-new-tab",
                    shortcuts: {
                        mac: {
                            key: "command+option+n",
                            label: "\u2318\u2325N"
                        },
                        other: {
                            key: "ctrl+alt+n",
                            label: "Ctrl+Alt+N"
                        }
                    }
                },
                disabled: false
            },
            {
                id: "open",
                label: "打开",
                command: {
                    id: "open-file-open-dialog",
                    shortcuts: {
                        mac: {
                            key: "command+o",
                            label: "\u2318O"
                        },
                        other: {
                            key: "ctrl+o",
                            label: "Ctrl+O"
                        }
                    }
                },
                disabled: false
            },
            {
                id: "openSample",
                label: "导入例子",
                command: {
                    id: "open-sample-file-open-dialog",
                    shortcuts: {
                        mac: {
                            key: "command+shift+o",
                            label: "\u2318\u21E7O"
                        },
                        other: {
                            key: "ctrl+shift+o",
                            label: "Ctrl+Shift+O"
                        }
                    }
                },
                disabled: false
            },
            {
                id: "save",
                label: "保存",
                command: {
                    id: "save",
                    shortcuts: {
                        mac: {
                            key: "command+s",
                            label: "\u2318S"
                        },
                        other: {
                            key: "ctrl+s",
                            label: "Ctrl+S"
                        }
                    }
                },
                disabled: false
            },
            {
                id: "saveAs",
                label: "另存为",
                command: {
                    id: "open-file-save-dialog",
                    shortcuts: {
                        mac: {
                            key: "command+shift+s",
                            label: "\u2318\u21E7S"
                        },
                        other: {
                            key: "ctrl+shift+s",
                            label: "Ctrl+Shift+S"
                        }
                    }
                },
                disabled: false
            },
            {
                id: "import",
                label: "导入文件",
                command: {
                    id: "import-file-import-dialog",
                    shortcuts: {
                        mac: {
                            key: "command+i",
                            label: "\u2318I"
                        },
                        other: {
                            key: "ctrl+i",
                            label: "Ctrl+I"
                        }
                    }
                },
                disabled: false
            },
            {
                id: "export",
                label: "导出文件",
                command: {
                    id: "export",
                    shortcuts: {
                        mac: {
                            key: "command+e",
                            label: "\u2318E"
                        },
                        other: {
                            key: "ctrl+e",
                            label: "Ctrl+E"
                        }
                    }
                },
                disabled: false
            },
            {
                id: "close",
                label: "关闭文件",
                command: {
                    id: "close",
                    shortcuts: {
                        mac: {
                            key: "command+shift+c",
                            label: "\u2318\u21E7C"
                        },
                        other: {
                            key: "ctrl+shift+c",
                            label: "Ctrl+Shift+C"
                        }
                    }
                },
                disabled: false
            },
            {
                id: "closeAll",
                label: "全部关闭",
                command: {
                    id: "close-all",
                    shortcuts: {
                        mac: {
                            key: "command+alt+x",
                            label: "\u2318\u2303X"
                        },
                        other: {
                            key: "ctrl+alt+x",
                            label: "Ctrl+Alt+X"
                        }
                    }
                },
                disabled: false
            },
            {
                id: "delete",
                label: "删除文件",
                command: {
                    id: "delete-file-delete-dialog",
                    shortcuts: {
                        mac: {
                            key: "command+d",
                            label: "\u2318D"
                        },
                        other: {
                            key: "ctrl+d",
                            label: "Ctrl+D"
                        }
                    }
                },
                disabled: false
            },
            {
                id: "settings",
                label: "设置",
                command: {
                    id: "open-settings-dialog",
                    shortcuts: {
                        mac: {
                            key: "command+option+e",
                            label: "\u2318\u2325E"
                        },
                        other: {
                            key: "ctrl+alt+e",
                            label: "Ctrl+Alt+E"
                        }
                    }
                },
                disabled: false
            }

            ]

    };

    return FileMenu;
}));
