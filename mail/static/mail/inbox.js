document.addEventListener("DOMContentLoaded", function() {

  // Use buttons to toggle between views
  document.querySelector("#inbox").addEventListener("click", () => loadMailbox("inbox"));
  document.querySelector("#sent").addEventListener("click", () => loadMailbox("sent"));
  document.querySelector("#archive").addEventListener("click", () => loadMailbox("archive"));
  document.querySelector("#compose").addEventListener("click", () => composeEmail());

  // By default, load the inbox
  loadMailbox("inbox");

  // Send an email and load Sent mailbox
  document.querySelector("#compose-form").onsubmit = () => {
    const recipients = document.querySelector("#compose-recipients").value;
    const subject = document.querySelector("#compose-subject").value;
    const body = document.querySelector("#compose-body").value;
    sendEmail(recipients, subject, body);
    return false;
  }
});

// Display messages received from API
function displayResult(result) {
  document.querySelector("#api-result").innerHTML = typeof result === "string" ? result : result.message || result.error;
  $("#api-messages").fadeTo(1000, 100, () => {
    $("#api-messages").fadeTo(2500, 0).slideUp(500);
  });
}

function composeEmail(recipients="", subject="", body="", focus=false) {

  // Show compose view and hide other views
  document.querySelector("#email").style.display = "none";
  document.querySelector("#emails-view").style.display = "none";
  document.querySelector("#compose-view").style.display = "block";
  
  // Change navbar active tab
  $("a").removeClass("active");
  $("#compose").addClass("active");

  // Clear out or fill composition fields if user is replying to an email
  document.querySelector("#compose-recipients").value = recipients;
  document.querySelector("#compose-subject").value = subject;
  document.querySelector("#compose-body").value = body;

  // Focuses on body input if replying to an email
  if (focus) {
    $("#compose-body").focus();
    $("#compose-body").get(0).setSelectionRange(0, 0);
  }
}

function loadMailbox(mailbox) {

  // Hide api-messages div
  $("#api-messages").hide();

  // Change navbar active tab
  $("a").removeClass("active");
  $(`#${mailbox}`).addClass("active");
  
  // Query the API for the emails in specified mailbox
  fetch(`/emails/${mailbox}`)
  .then(response => response.json())
  .then(emails => {
    // Render emails
    if (emails !== undefined) {
        emails.forEach(email => {
          const element = document.createElement("div");
          element.classList.add("emails", "border", "border-dark", "rounded");
          if (mailbox === "sent") {
            element.innerHTML = `
              <span class="recipients">${email.recipients}</span> <span class="subject">${email.subject}</span> <span class="timestamp">${email.timestamp}</span>
            `;
          } else {
            element.innerHTML = ` 
              <span class="recipients">${email.sender}</span> <span class="subject">${email.subject}</span> <span class="timestamp">${email.timestamp}</span>
            `;
          }
          // Grey background color if email has been read
          email.read === true ? element.style.backgroundColor = "rgba(211, 211, 211, 85%)" : element.style.backgroundColor = "rgba(255, 255, 255, 85%)";
          element.addEventListener("click", () => loadEmail(email, mailbox));
          document.querySelector("#emails-view").append(element);
      })
    }
  })
  .catch(error => console.log(error));
  
  // Show the mailbox and hide other views
  document.querySelector("#emails-view").style.display = "block";
  document.querySelector("#compose-view").style.display = "none";
  document.querySelector("#email").style.display = "none";

  // Show the mailbox name
  document.querySelector("#emails-view").innerHTML = `<h3 class="page-title">${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;
}

function loadEmail(email, emailType) {

  // Hide emails view
  document.querySelector("#emails-view").style.display = "none";

  // Display the individual email div
  document.querySelector("#email").style.display = "block";
  
  // Display archive button if not viewing Sent emails
  if (emailType !== "sent") {
    archiveStatus = document.querySelector("#archive-status");
    email.archived === false ? archiveStatus.innerHTML = "Archive" : archiveStatus.innerHTML = "Unarchive";
    $("#archive-button").bind("click", () => toggleArchive(email));
  } else {
    document.querySelector("#archive-button").style.display = "none";
  }

  // Configure reply button
  document.querySelector("#reply-button").addEventListener("click", () => reply(email));

  // Update elements to show email content and details
  document.querySelector("#from").innerHTML = `<strong class="field">From:</strong> ${email.sender}`;
  document.querySelector("#to").innerHTML = `<strong class="field">To:</strong> ${email.recipients}`;
  document.querySelector("#subject").innerHTML = `<h4>${email.subject}</h4>`;
  document.querySelector("#timestamp").innerHTML = `<h6>${email.timestamp}</h6>`;
  document.querySelector("#content").innerHTML = email.body;

  // Mark email as read (if it isn't already)
  if (email.read === false) {
    fetch(`/emails/${email.id}`, {
      method: "PUT",
      body: JSON.stringify({
        read: true
      })
    })
  }
}

function sendEmail(recipients, subject, body) {

  fetch("/emails", {
    method: "POST",
    body: JSON.stringify({
      recipients: recipients,
      subject: subject,
      body: body
    })
  })
  .then(response => response.json())
  .then(result => {
    if (!("error" in result)) loadMailbox("sent");
    displayResult(result);
  })
  .catch(error => console.log(error))
}

function toggleArchive(email) {
  const toggle = email.archived === true ? false : true;
  fetch(`/emails/${email.id}`, {
    method: "PUT",
    body: JSON.stringify({
      archived: toggle
    })
  })
  .then(() => $("#archive-button").unbind("click"))  .then(() => loadMailbox("inbox"))
  .then(() => toggle === true ? displayResult(`<em>${email.subject}</em> successfully Archived`) : displayResult(`<em>${email.subject}</em> successfully Unarchived`))
  .catch(error => console.log(error))
}

function reply(email) {
  const timestamp = email.timestamp.split(",");
  const recipients = email.sender;
  const subject = email.subject.slice(0, 3) !== "Re" ? `Re: ${email.subject}` : `${email.subject}`;
  const body = `\n\n------------------------------------------------------------\n\nOn ${timestamp[0]}, at ${timestamp[1].trim()} ${email.sender} wrote:\n\n"${email.body}"`;
  composeEmail(recipients, subject, body, true);
}

