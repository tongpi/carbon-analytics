/*
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

package org.wso2.carbon.stream.processor.core.event.queue;

import org.wso2.siddhi.core.event.Event;

public class QueuedEvent {
    private String sourceHandlerElementId;
    private Event event;
    private long timestamp;

    public QueuedEvent(String sourceHandlerElementId, Event event) {
        this.sourceHandlerElementId = sourceHandlerElementId;
        this.event = event;
    }

    public String getSourceHandlerElementId() {
        return sourceHandlerElementId;
    }

    public void setSourceHandlerElementId(String sourceHandlerElementId) {
        this.sourceHandlerElementId = sourceHandlerElementId;
    }

    public Event getEvent() {
        return event;
    }

    public void setEvent(Event event) {
        this.event = event;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {

        this.timestamp = timestamp;
    }
}