import * as core from "@actions/core";
export var getOptions = function() {
    return {
        majorLabels: core.getInput("major-labels", {
            required: true
        }).split(","),
        minorLabels: core.getInput("minor-labels", {
            required: true
        }).split(","),
        versionPrefix: core.getInput("version-prefix", {
            required: true
        })
    };
};
