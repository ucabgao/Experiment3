/*
 * vim: ts=4:sw=4:expandtab
 */
(function () {
    'use strict';
    window.Whisper = window.Whisper || {};

    var Message  = window.Whisper.Message = Backbone.Model.extend({
        database  : Whisper.Database,
        storeName : 'messages',
        initialize: function() {
            this.on('change:attachments', this.updateImageUrl);
            this.on('destroy', this.revokeImageUrl);
        },
        defaults  : function() {
            return {
                timestamp: new Date().getTime(),
                attachments: []
            };
        },
        validate: function(attributes, options) {
            var required = ['conversationId', 'received_at', 'sent_at'];
            var missing = _.filter(required, function(attr) { return !attributes[attr]; });
            if (missing.length) {
                console.log("Message missing attributes: " + missing);
            }
        },
        isEndSession: function() {
            var flag = textsecure.protobuf.DataMessage.Flags.END_SESSION;
            return !!(this.get('flags') & flag);
        },
        isGroupUpdate: function() {
            return !!(this.get('group_update'));
        },
        isIncoming: function() {
            return this.get('type') === 'incoming';
        },
        getDescription: function() {
            if (this.isGroupUpdate()) {
                var group_update = this.get('group_update');
                if (group_update.left) {
                    return group_update.left + ' left the group.';
                }

                var messages = ['Updated the group.'];
                if (group_update.name) {
                    messages.push("Title is now '" + group_update.name + "'.");
                }
                if (group_update.joined) {
                    messages.push(group_update.joined.join(', ') + ' joined the group.');
                }

                return messages.join(' ');
            }
            if (this.isEndSession()) {
                return 'Secure session ended.';
            }
            if (this.isIncoming() && this.hasKeyConflicts()) {
                return 'Received message with unknown identity key.';
            }
            if (this.isIncoming() && this.hasErrors()) {
                return 'Error handling incoming message.';
            }

            return this.get('body');
        },
        getNotificationText: function() {
            var description = this.getDescription();
            if (description) {
                return description;
            }
            if (this.get('attachments').length > 0) {
                return 'Media message';
            }

            return '';
        },
        updateImageUrl: function() {
            this.revokeImageUrl();
            var attachment = this.get('attachments')[0];
            if (attachment) {
                var blob = new Blob([attachment.data], {
                    type: attachment.contentType
                });
                this.imageUrl = URL.createObjectURL(blob);
            } else {
                this.imageUrl = null;
            }
        },
        revokeImageUrl: function() {
            if (this.imageUrl) {
                URL.revokeObjectURL(this.imageUrl);
                this.imageUrl = null;
            }
        },
        getImageUrl: function() {
            if (this.imageUrl === undefined) {
                this.updateImageUrl();
            }
            return this.imageUrl;
        },
        getContact: function() {
            var conversationId = this.get('source');
            if (!this.isIncoming()) {
                conversationId = textsecure.storage.user.getNumber();
            }
            var c = ConversationController.get(conversationId);
            if (!c) {
                c = ConversationController.create({id: conversationId, type: 'private'});
                c.fetch();
            }
            return c;
        },
        isOutgoing: function() {
            return this.get('type') === 'outgoing';
        },
        hasErrors: function() {
            return _.size(this.get('errors')) > 0;
        },
        hasKeyConflicts: function() {
            return _.any(this.get('errors'), function(e) {
                return (e.name === 'IncomingIdentityKeyError' ||
                        e.name === 'OutgoingIdentityKeyError');
            });
        },
        hasKeyConflict: function(number) {
            return _.any(this.get('errors'), function(e) {
                return (e.name === 'IncomingIdentityKeyError' ||
                        e.name === 'OutgoingIdentityKeyError') &&
                        e.number === number;
            });
        },
        getKeyConflict: function(number) {
            return _.find(this.get('errors'), function(e) {
                return (e.name === 'IncomingIdentityKeyError' ||
                        e.name === 'OutgoingIdentityKeyError') &&
                        e.number === number;
            });
        },

        send: function(promise) {
            this.trigger('pending');
            return promise.then(function(result) {
                this.trigger('done');
                if (result.dataMessage) {
                    this.set({dataMessage: result.dataMessage});
                }
                this.save({sent: true});
                this.sendSyncMessage();
            }.bind(this)).catch(function(result) {
                this.trigger('done');
                if (result.dataMessage) {
                    this.set({dataMessage: result.dataMessage});
                }
                this.set({sent: true});

                if (result instanceof Error) {
                    this.saveErrors(result);
                } else {
                    this.saveErrors(result.errors);
                    if (result.successfulNumbers.length > 0) {
                        this.sendSyncMessage();
                    }
                }

            }.bind(this));
        },

        sendSyncMessage: function() {
            var dataMessage = this.get('dataMessage');
            if (this.get('synced') || !dataMessage) {
                return;
            }

            textsecure.messaging.sendSyncMessage(
                dataMessage, this.get('sent_at'), this.get('destination')
            ).then(function() {
                this.save({synced: true, dataMessage: null});
            }.bind(this));
        },

        saveErrors: function(errors) {
            if (!(errors instanceof Array)) {
                errors = [errors];
            }
            errors.forEach(function(e) {
                console.log(e);
                console.log(e.reason, e.stack);
            });
            errors = errors.map(function(e) {
                if (e.constructor === Error ||
                    e.constructor === TypeError ||
                    e.constructor === ReferenceError) {
                    return _.pick(e, 'name', 'message', 'code', 'number', 'reason');
                }
                return e;
            });
            errors = errors.concat(this.get('errors') || []);

            return this.save({errors : errors});
        },

        removeConflictFor: function(number) {
            var errors = _.reject(this.get('errors'), function(e) {
                return e.number === number &&
                    (e.name === 'IncomingIdentityKeyError' ||
                     e.name === 'OutgoingIdentityKeyError');
            });
            this.set({errors: errors});
        },

        removeOutgoingErrors: function(number) {
            var errors = _.partition(this.get('errors'), function(e) {
                return e.number === number &&
                    (e.name === 'OutgoingMessageError' ||
                     e.name === 'SendMessageNetworkError');
            });
            this.set({errors: errors[1]});
            return errors[0][0];
        },

        resend: function(number) {
            var error = this.removeOutgoingErrors(number);
            if (error) {
                var promise = new textsecure.ReplayableError(error).replay();
                this.send(promise);
            }
        },

        resolveConflict: function(number) {
            var error = this.getKeyConflict(number);
            if (error) {
                var promise = new textsecure.ReplayableError(error).replay();
                if (this.isIncoming()) {
                    promise = promise.then(function(dataMessage) {
                        this.removeConflictFor(number);
                        this.handleDataMessage(dataMessage);
                    }.bind(this));
                } else {
                    promise = promise.then(function() {
                        this.removeConflictFor(number);
                        this.save();
                    }.bind(this));
                }
                promise.catch(function(e) {
                    this.saveErrors(e);
                }.bind(this));

                return promise;
            }
        },
        handleDataMessage: function(dataMessage) {
            // This function can be called from the background script on an
            // incoming message or from the frontend after the user accepts an
            // identity key change.
            var message = this;
            var source = message.get('source');
            var type = message.get('type');
            var timestamp = message.get('sent_at');
            var conversationId = message.get('conversationId');
            if (dataMessage.group) {
                conversationId = dataMessage.group.id;
            }
            var conversation = ConversationController.create({id: conversationId});
            conversation.fetch().always(function() {
                var now = new Date().getTime();
                var attributes = { type: 'private' };
                if (dataMessage.group) {
                    var group_update = {};
                    attributes = {
                        type: 'group',
                        groupId: dataMessage.group.id,
                    };
                    if (dataMessage.group.type === textsecure.protobuf.GroupContext.Type.UPDATE) {
                        attributes = {
                            type       : 'group',
                            groupId    : dataMessage.group.id,
                            name       : dataMessage.group.name,
                            avatar     : dataMessage.group.avatar,
                            members    : dataMessage.group.members,
                        };
                        group_update = conversation.changedAttributes(_.pick(dataMessage.group, 'name', 'avatar')) || {};
                        var difference = _.difference(dataMessage.group.members, conversation.get('members'));
                        if (difference.length > 0) {
                            group_update.joined = difference;
                        }
                    }
                    else if (dataMessage.group.type === textsecure.protobuf.GroupContext.Type.QUIT) {
                        if (source == textsecure.storage.user.getNumber()) {
                            group_update = { left: "You" };
                        } else {
                            group_update = { left: source };
                        }
                        attributes.members = _.without(conversation.get('members'), source);
                    }

                    if (_.keys(group_update).length > 0) {
                        message.set({group_update: group_update});
                    }
                }
                if (type === 'outgoing') {
                    // lazy hack - check for receipts that arrived early.
                    if (dataMessage.group && dataMessage.group.id) {  // group sync
                        var members = conversation.get('members') || [];
                        var receipts = window.receipts.where({ timestamp: timestamp });
                        for (var i in receipts) {
                            if (members.indexOf(receipts[i].get('source')) > -1) {
                                window.receipts.remove(receipts[i]);
                                message.set({
                                    delivered: (message.get('delivered') || 0) + 1
                                });
                            }
                        }
                    } else {
                        var receipt = window.receipts.findWhere({
                            timestamp: timestamp,
                            source: conversationId
                        });
                        if (receipt) {
                            window.receipts.remove(receipt);
                            message.set({
                                delivered: (message.get('delivered') || 0) + 1
                            });
                        }
                    }
                }
                attributes.active_at = now;
                if (type === 'incoming') {
                    attributes.unreadCount = conversation.get('unreadCount') + 1;
                }
                conversation.set(attributes);

                message.set({
                    body           : dataMessage.body,
                    conversationId : conversation.id,
                    attachments    : dataMessage.attachments,
                    decrypted_at   : now,
                    flags          : dataMessage.flags,
                    errors         : []
                });

                var conversation_timestamp = conversation.get('timestamp');
                if (!conversation_timestamp || message.get('sent_at') > conversation_timestamp) {
                    conversation.set({
                        timestamp: message.get('sent_at'),
                        lastMessage: message.getNotificationText()
                    });
                }
                else if (!conversation.get('lastMessage')) {
                    conversation.set({
                        lastMessage: message.getNotificationText()
                    });
                }

                message.save().then(function() {
                    conversation.save().then(function() {
                        conversation.trigger('newmessage', message);
                        conversation.notify(message);
                    });
                });
            });
        }

    });

    Whisper.MessageCollection = Backbone.Collection.extend({
        model      : Message,
        database   : Whisper.Database,
        storeName  : 'messages',
        comparator : 'received_at',
        initialize : function(models, options) {
            if (options) {
                this.conversation = options.conversation;
            }
        },
        destroyAll : function () {
            return Promise.all(this.models.map(function(m) {
                return new Promise(function(resolve, reject) {
                    m.destroy().then(resolve).fail(reject);
                });
            }));
        },

        fetchSentAt: function(timestamp) {
            return this.fetch({
                index: {
                    // 'receipt' index on sent_at
                    name: 'receipt',
                    only: timestamp
                }
            });
        },

        fetchConversation: function(conversationId) {
            return new Promise(function(resolve) {
                var upper;
                if (this.length === 0) {
                    // fetch the most recent messages first
                    upper = Number.MAX_VALUE;
                } else  {
                    // not our first rodeo, fetch older messages.
                    upper = this.at(0).get('received_at');
                }
                var options = {remove: false, limit: 100};
                options.index = {
                    // 'conversation' index on [conversationId, received_at]
                    name  : 'conversation',
                    lower : [conversationId],
                    upper : [conversationId, upper],
                    order : 'desc'
                    // SELECT messages WHERE conversationId = this.id ORDER
                    // received_at DESC
                };
                this.fetch(options).then(resolve);
            }.bind(this));
        },

        hasKeyConflicts: function() {
            return this.any(function(m) { return m.hasKeyConflicts(); });
        }
    });
})();
