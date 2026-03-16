"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Platform = exports.PublishJobStatus = exports.DraftStatus = exports.MediaType = exports.MessageRole = exports.SessionStatus = void 0;
var SessionStatus;
(function (SessionStatus) {
    SessionStatus["COLLECTING_MEDIA"] = "COLLECTING_MEDIA";
    SessionStatus["ASKING_QUESTIONS"] = "ASKING_QUESTIONS";
    SessionStatus["GENERATING_DRAFTS"] = "GENERATING_DRAFTS";
    SessionStatus["AWAITING_APPROVAL"] = "AWAITING_APPROVAL";
    SessionStatus["APPROVED"] = "APPROVED";
    SessionStatus["PUBLISHING"] = "PUBLISHING";
    SessionStatus["PUBLISHED"] = "PUBLISHED";
    SessionStatus["CANCELLED"] = "CANCELLED";
    SessionStatus["FAILED"] = "FAILED";
})(SessionStatus || (exports.SessionStatus = SessionStatus = {}));
var MessageRole;
(function (MessageRole) {
    MessageRole["USER"] = "USER";
    MessageRole["AGENT"] = "AGENT";
    MessageRole["SYSTEM"] = "SYSTEM";
})(MessageRole || (exports.MessageRole = MessageRole = {}));
var MediaType;
(function (MediaType) {
    MediaType["PHOTO"] = "PHOTO";
    MediaType["VIDEO"] = "VIDEO";
})(MediaType || (exports.MediaType = MediaType = {}));
var DraftStatus;
(function (DraftStatus) {
    DraftStatus["DRAFT"] = "DRAFT";
    DraftStatus["APPROVED"] = "APPROVED";
    DraftStatus["NEEDS_REVISION"] = "NEEDS_REVISION";
    DraftStatus["PUBLISHED"] = "PUBLISHED";
    DraftStatus["FAILED"] = "FAILED";
})(DraftStatus || (exports.DraftStatus = DraftStatus = {}));
var PublishJobStatus;
(function (PublishJobStatus) {
    PublishJobStatus["PENDING"] = "PENDING";
    PublishJobStatus["UPLOADING"] = "UPLOADING";
    PublishJobStatus["COMPLETED"] = "COMPLETED";
    PublishJobStatus["FAILED"] = "FAILED";
    PublishJobStatus["RETRYING"] = "RETRYING";
})(PublishJobStatus || (exports.PublishJobStatus = PublishJobStatus = {}));
var Platform;
(function (Platform) {
    Platform["YOUTUBE"] = "YOUTUBE";
    Platform["FACEBOOK"] = "FACEBOOK";
})(Platform || (exports.Platform = Platform = {}));
//# sourceMappingURL=session.js.map