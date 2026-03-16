"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobStatus = exports.JobType = void 0;
var JobType;
(function (JobType) {
    JobType["ANALYZE_MEDIA"] = "ANALYZE_MEDIA";
    JobType["GENERATE_DRAFTS"] = "GENERATE_DRAFTS";
    JobType["PUBLISH_YOUTUBE"] = "PUBLISH_YOUTUBE";
    JobType["PUBLISH_FACEBOOK"] = "PUBLISH_FACEBOOK";
})(JobType || (exports.JobType = JobType = {}));
var JobStatus;
(function (JobStatus) {
    JobStatus["PENDING"] = "PENDING";
    JobStatus["PROCESSING"] = "PROCESSING";
    JobStatus["COMPLETED"] = "COMPLETED";
    JobStatus["FAILED"] = "FAILED";
    JobStatus["RETRYING"] = "RETRYING";
})(JobStatus || (exports.JobStatus = JobStatus = {}));
//# sourceMappingURL=job.js.map