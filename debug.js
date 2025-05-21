// This file expands the debugging utilities for Kibana Table Exporter

// Check if utils.js is loaded, if not, define the utilities here
if (typeof kibanaTableUtils === 'undefined') {
  console.log('Defining global kibanaTableUtils');
  
  window.kibanaTableUtils = {
    // Core environment checks
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
    
    // Log environment information
    logEnvironmentInfo: function() {
      const envCheck = this.checkEnvironment();
      
      console.log("Environment check:", envCheck.hasIssues ? "Issues found" : "All good");
      
      if (envCheck.hasIssues) {
        console.warn("Issues:", envCheck.issues);
      }
      
      return envCheck;
    },
    
    // Test CSP compatibility
    testCspCompatibility: function() {
      console.log("Testing CSP compatibility...");
      
      const tests = [
        {
          name: "External script loading",
          test: function() {
            return typeof bootstrap !== 'undefined' || typeof window.bootstrap !== 'undefined';
          },
          description: "Tests if external scripts can load properly with the current CSP"
        },
        {
          name: "DOM Manipulation",
          test: function() {
            try {
              const testDiv = document.createElement('div');
              testDiv.id = 'csp-test-div';
              testDiv.textContent = 'CSP Test';
              document.body.appendChild(testDiv);
              const success = document.getElementById('csp-test-div') !== null;
              document.body.removeChild(testDiv);
              return success;
            } catch (e) {
              console.error("DOM manipulation test failed:", e);
              return false;
            }
          },
          description: "Tests if DOM manipulation works as expected"
        },
        {
          name: "Storage Access",
          test: function() {
            try {
              localStorage.setItem('cspTest', 'test');
              const value = localStorage.getItem('cspTest');
              localStorage.removeItem('cspTest');
              return value === 'test';
            } catch (e) {
              console.error("Storage access test failed:", e);
              return false;
            }
          },
          description: "Tests if local storage can be accessed"
        }
      ];
      
      const results = tests.map(test => {
        const passed = test.test();
        return {
          name: test.name,
          passed: passed,
          description: test.description
        };
      });
      
      console.table(results);
      
      return {
        allPassed: results.every(r => r.passed),
        results: results
      };
    },
    
    // Create a visual report in the page
    createVisualReport: function() {
      const envCheck = this.checkEnvironment();
      const cspTests = this.testCspCompatibility();
      
      const reportDiv = document.createElement('div');
      reportDiv.id = 'kibana-table-debug-report';
      reportDiv.style.position = 'fixed';
      reportDiv.style.bottom = '10px';
      reportDiv.style.right = '10px';
      reportDiv.style.width = '350px';
      reportDiv.style.backgroundColor = '#f8f9fa';
      reportDiv.style.border = '1px solid #dee2e6';
      reportDiv.style.borderRadius = '5px';
      reportDiv.style.padding = '15px';
      reportDiv.style.zIndex = '9999';
      reportDiv.style.boxShadow = '0 0 10px rgba(0,0,0,0.1)';
      reportDiv.style.maxHeight = '80vh';
      reportDiv.style.overflow = 'auto';
      
      let html = `
        <h5>Kibana Table Extension Diagnostics</h5>
        <div style="margin-bottom: 10px;">
          <strong>Environment:</strong> ${envCheck.hasIssues ? '❌ Issues Found' : '✅ OK'}<br>
          <strong>CSP Compatibility:</strong> ${cspTests.allPassed ? '✅ Compatible' : '❌ Incompatible'}
        </div>
        
        <div style="font-size: 0.9rem;">
          <strong>Environment Issues:</strong>
          <ul style="margin-top: 5px; padding-left: 20px;">
      `;
      
      if (envCheck.issues.length > 0) {
        envCheck.issues.forEach(issue => {
          html += `<li>${issue}</li>`;
        });
      } else {
        html += `<li>None detected</li>`;
      }
      
      html += `
          </ul>
          
          <strong>CSP Tests:</strong>
          <ul style="margin-top: 5px; padding-left: 20px;">
      `;
      
      cspTests.results.forEach(result => {
        html += `<li>${result.passed ? '✅' : '❌'} ${result.name}</li>`;
      });
      
      html += `
          </ul>
        </div>
        
        <div style="margin-top: 10px; text-align: center;">
          <button id="close-debug-report" style="padding: 5px 10px; font-size: 0.8rem;">Close Report</button>
        </div>
      `;
      
      reportDiv.innerHTML = html;
      document.body.appendChild(reportDiv);
      
      document.getElementById('close-debug-report').addEventListener('click', function() {
        document.body.removeChild(reportDiv);
      });
    }
  };
}

// Automatically run checks if this script is loaded directly
document.addEventListener('DOMContentLoaded', function() {
  console.log('Debug utilities loaded');
  
  // Only create the visual report if the debug parameter is present
  if (window.location.hash.includes('debug')) {
    setTimeout(() => {
      kibanaTableUtils.createVisualReport();
    }, 1000); // Wait for page to fully load
  }
});
