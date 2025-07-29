<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>BrokersBloc Tracker</title>
</head>
<body>
  <div id="login-section">
    <h2>Login</h2>
    <input type="email" id="email" placeholder="Email" /><br>
    <input type="password" id="password" placeholder="Password" /><br>
    <button onclick="verifyBroker()">Login</button>
    <p id="login-error" style="color:red;"></p>
  </div>

  <div id="dashboard-section" style="display:none;">
    <h2 id="welcome-msg"></h2>
    <button onclick="openRfpForm()">Submit New RFP</button>
    <button onclick="loadDashboard()">Refresh Tracker</button>
    <button onclick="logout()">Logout</button>
    <div id="tracker-container"></div>
  </div>

  <script>
    async function verifyBroker() {
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      const res = await fetch(`/api/verify-broker?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);
      const data = await res.json();

      if (res.ok) {
        sessionStorage.setItem("brokerName", data.brokerName);
        sessionStorage.setItem("brokerEmail", email);
        sessionStorage.setItem("brokerPassword", password);
        loadDashboard();
      } else {
        document.getElementById("login-error").textContent = "Invalid email or password.";
      }
    }

    function loadDashboard() {
      const name = sessionStorage.getItem("brokerName");
      const email = sessionStorage.getItem("brokerEmail");

      if (!name || !email) return;

      document.getElementById("login-section").style.display = "none";
      document.getElementById("dashboard-section").style.display = "block";
      document.getElementById("welcome-msg").textContent = `Welcome, ${name}`;

      fetch(`/api/projects?broker=${encodeURIComponent(name)}`)
        .then(res => res.json())
        .then(data => {
          const container = document.getElementById("tracker-container");
          container.innerHTML = "";
          if (!data.length) {
            container.innerHTML = "<p>No RFPs found.</p>";
            return;
          }
          data.forEach(rfp => {
            container.innerHTML += `<div><strong>${rfp.projectName}</strong> - ${rfp.stage} - ${rfp.timeRemaining}</div>`;
          });
        });
    }

    function openRfpForm() {
      const name = sessionStorage.getItem("brokerName");
      const email = sessionStorage.getItem("brokerEmail");
      const password = sessionStorage.getItem("brokerPassword");

      const url = `https://airtable.com/appTl5b0TOB6Sh8N5/pagd8oOz2RO9zbYGb/form?prefill_Username=${encodeURIComponent(name)}&prefill_Email=${encodeURIComponent(email)}&prefill_Password=${encodeURIComponent(password)}`;
      window.open(url, "_blank");
    }

    function logout() {
      sessionStorage.clear();
      location.reload();
    }

    if (sessionStorage.getItem("brokerName")) {
      loadDashboard();
    }
  </script>
</body>
</html>
