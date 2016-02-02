import {angular} from "angular";
import {setProp} from "../util/util";
import './filters/messageBodyFilter';

/**
 * This state shows the contents of a single message.
 * It also has UI to reply, forward, delete, or edit an existing draft.
 */
let template = `
<div class="message">

  <div class="header">
    <div>
      <h4>{{vm.message.subject}}</h4>
      <h5>{{vm.message.from}} <i class="fa fa-long-arrow-right"></i> {{vm.message.to}}</h5>
    </div>

    <div class="line2">
      <div>{{vm.message.date | date: 'longDate'}} {{vm.message.date | date: 'mediumTime'}}</div>
      <div>
        <button class="btn btn-primary" ng-show="vm.actions.edit" ng-click="vm.editDraft(vm.message)"><i class="fa fa-pencil"></i> <span>Edit Draft</span></button>
        <button class="btn btn-primary" ng-show="vm.actions.reply" ng-click="vm.reply(vm.message)"><i class="fa fa-reply"></i> <span>Reply</span></button>
        <button class="btn btn-primary" ng-show="vm.actions.forward" ng-click="vm.forward(vm.message)"><i class="fa fa-forward" ></i> <span>Forward</span></button>
        <button class="btn btn-primary" ng-show="vm.actions.delete" ng-click="vm.remove(vm.message)"><i class="fa fa-close"></i> <span>Delete</span></button>
      </div>
    </div>
  </div>

  // Pass the raw (plain text) message body through the messageBody filter to format slightly nicer.
  <div class="body" ng-bind-html="::vm.message.body | messageBody"></div>
</div>
`;

/** Helper function to prefix a message with "fwd: " or "re: " */
const prefixSubject = (prefix, message) => prefix + message.subject;
/** Helper function which quotes an email message */
const quoteMessage = (message) => `



---------------------------------------
Original message:
From: ${message.from}
Date: ${message.date}
Subject: ${message.subject}

${message.body}`;


function MessageController($state, dialogService, Messages, MessageListUi, folder, message) {
  this.message = message;
  message.read = true;
  Messages.put(message);

  this.actions = folder.actions.reduce((obj, action) => setProp(obj, action, true), {});

  let makeResponseMsg = (subjectPrefix, origMsg) => ({
    from: origMsg.to,
    to: origMsg.from,
    subject: prefixSubject(subjectPrefix, origMsg),
    body: quoteMessage(origMsg)
  });

  this.reply = function(message) {
    let replyMsg = makeResponseMsg("Re: ", message);
    $state.go('mymessages.compose', { message: replyMsg });
  };

  this.forward = function(message) {
    let fwdMsg = makeResponseMsg("Fwd: ", message);
    delete fwdMsg.to;
    $state.go('mymessages.compose', { message: fwdMsg });
  };

  this.editDraft = function(message) {
    $state.go('mymessages.compose', { message: message });
  };

  this.remove = function(message) {
    let nextMessageId = MessageListUi.proximalMessageId(message._id);
    let nextState = nextMessageId ? 'mymessages.folder.message' : 'mymessages.folder';
    let params = { messageId: nextMessageId };

    dialogService.confirm("Delete?", undefined)
        .then(() => Messages.remove(message))
        .then(() => $state.go(nextState, params, { reload: 'mymessages.folder' }));
  };
}

let messageState = {
  name: 'mymessages.folder.message',
  url: '/:messageId',
  resolve: {
    // Fetch the message from the Messages service using the messageId parameter
    message: (Messages, $stateParams) => Messages.get($stateParams.messageId),
    MessageListUi: ($filter, AppConfig, messages) => ({
      // This is a UI helper which finds the nearest messageId in the messages list to the messageId parameter
      proximalMessageId: (messageId) => {
        let sorted = $filter("orderBy")(messages, AppConfig.sort);
        let idx = sorted.findIndex(msg => msg._id === messageId);
        var proximalIdx = sorted.length > idx + 1 ? idx + 1 : idx - 1;
        return proximalIdx >= 0 ? sorted[proximalIdx]._id : undefined;
      }
    })
  },
  views: {
    // Relatively target the parent-state's parent-state's 'messagecontent' ui-view
    // This could also have been written using ui-view@state addressing: 'messagecontent@mymessages'
    // Or, this could also have been written using absolute ui-view addressing: '!$default.$default.messagecontent'
    "^.^.messagecontent": {
      template: template,
      controller: MessageController,
      controllerAs: 'vm'
    }
  }
};

export {messageState};