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

define(['jquery', './modal-dialog'], function ($, ModalDialog) {

    var CloseConfirmDialog = function (options) {
        this._options = options;
        this._$container = $(_.get(options, 'container', 'body'));
        this._initialized = false;
    };

    CloseConfirmDialog.prototype = Object.create(ModalDialog.prototype);
    CloseConfirmDialog.prototype.constructor = CloseConfirmDialog;

    CloseConfirmDialog.prototype.init = function () {
        if(this._initialized) {
            return;
        }

        var saveBtn = $("<button type='button' class='btn btn-primary'>保存</button>");
        var dontSaveBtn = $("<button type='button' class='btn btn-default" +
                            " close-file-confirm-dialog-btn'>不保存，关闭</button>");
        var cancelBtn = $("<button type='button' class='btn btn-default'" +
                          " data-dismiss='modal'>取消</button>");
        this._saveBtn = saveBtn;
        this._dontSaveBtn = dontSaveBtn;

        this.getFooter().empty();
        this.getFooter().append(dontSaveBtn, saveBtn, cancelBtn);

        this._initialized = true;

        this._$modalContainer.addClass("close-confirm-dialog");
    }

    CloseConfirmDialog.prototype.askConfirmation = function (options) {
        var self = this;
        this.init();

        var name = options.file.getName();
        this.setTitle("保存变更吗?");

        var body = this.getBody();
        body.empty();
        body.append($("<p><br>文件 '" + name + "' 已更改, 要保存吗 ? <br>如果不保存关闭文件后，你所做的更改" +
            "会丢失.</p>"))

        this._saveBtn.unbind('click');
        this._dontSaveBtn.unbind('click');

        this._saveBtn.click(function(e){
            if(_.has(options, 'handleConfirm')){
                self.hide();
                options.handleConfirm(true);
            }
        });

        this._dontSaveBtn.click(function(e){
            if(_.has(options, 'handleConfirm')){
                self.hide();
                options.handleConfirm(false);
            }
        });

        this.show();
    }

    return CloseConfirmDialog;
});
