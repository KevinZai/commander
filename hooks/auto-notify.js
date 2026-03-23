// Hook: PostToolUse — notify when long operations complete
module.exports = {
  name: "auto-notify",
  event: "PostToolUse",
  handler: async (result) => {
    // If a command took >60s, add a notification hint
    if (result.durationMs && result.durationMs > 60000) {
      return {
        appendMessage: `\n⏱️ Operation took ${Math.round(result.durationMs / 1000)}s`
      };
    }
  }
};
