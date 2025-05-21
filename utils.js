// Helper script for the Kibana Table Exporter extension
console.log("Kibana Table Extension loaded");

// Define common utility functions
const kibanaTableUtils = {
  // Check if the required APIs are available
  checkEnvironment: function() {
    const issues = [];
    
    if (typeof chrome === 'undefined') {
      issues.push("Chrome API not available");
    } else if (typeof chrome.storage === 'undefined') {
      issues.push("Chrome Storage API not available");
    }
    
    if (typeof window.bootstrap === 'undefined') {
      issues.push("Bootstrap not available - will use fallback");
    }
    
    return {
      hasIssues: issues.length > 0,
      issues: issues
    };
  },
  
  // For debugging purposes
  logEnvironmentInfo: function() {
    const envCheck = this.checkEnvironment();
    
    console.log("Environment check:", envCheck.hasIssues ? "Issues found" : "All good");
    
    if (envCheck.hasIssues) {
      console.warn("Issues:", envCheck.issues);
    }
    
    return envCheck;
  }
};

// Log environment information when loaded
document.addEventListener('DOMContentLoaded', function() {
  kibanaTableUtils.logEnvironmentInfo();
});
