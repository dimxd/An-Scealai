

const nodemailer = require("nodemailer");

/**
 * Much of the following code was taken from this tutorial:
 * https://schadokar.dev/posts/how-to-send-email-in-nodejs/
 *
 * sendEmail
 * @param {Object} mailObj - Email meta data and body
 * @param {String} from - Email address of the sender
 * @param {Array} recipients - Array of recipients email address
 * @param {String} subject - Subject of the email
 * @param {String} message - message
 */


const fs = require('fs');

try{
  console.log("Attempting to read sendinblue auth data from ./api/sendinblue.json");
  let rawdata = fs.readFileSync('sendinblue.json');
  let sendinblueData = JSON.parse(rawdata);

  const sendEmail = async (mailObj) => {
    const { from, recipients, subject, message } = mailObj;

    try {
      // Create a transporter
      let transporter = nodemailer.createTransport({
        host: "smtp-relay.sendinblue.com",
        port: 587,
        auth: {
          user: sendinblueData.user,
          pass: sendinblueData.pass,
        },
      });

      // send mail with defined transport object.
      let mailStatus = await transporter.sendMail({
        from: from,
        to: recipients,
        subject: subject,
        text: message,
      });

      module.exports.sendEmail = sendEmail;
      return mailStatus;

    }catch(error){
      console.error(error);
      throw new Error(
        `Something went wrong in the sendmail method. Error: ${error.message}`
      );
    }

  }
}catch(err){
  console.error("Failed to create email transport in ./api/mail.js. Have you created sendinblue.json ?");
  console.error(err);
  module.exports.sendEmail = null;
  module.exports.couldNotCreate = true;
}


/* EXAMPLE OF HOW TO USE THE sendEmail function
const mailObj = {
  from: "nrobinso@tcd.ie",
  recipients: ["scealai.info@gmail.com"],
  subject: "TEST 2 -- With passwords hidden -- This was send by nodejs",
  message: "Hi everybody!",
};

sendEmail(mailObj).then((res) => {
  console.log(res);
});
*/
