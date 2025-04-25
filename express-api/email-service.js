import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || "mail.rwth-aachen.de",
  port: process.env.MAIL_PORT || 587,
  secure: false, // true for port 465, false for others
  auth: {
    user: process.env.MAIL_USER || "tk812812@rwth-aachen.de",
    pass: process.env.MAIL_PASS || "rwth_Naugatuck09"
  }
});

const emailService = {
  sendMailPasswordReset: (address, pass) => {
    const info = transporter.sendMail({
      from: `"Thomas Korsten" <thomas.korsten@rwth-aachen.de>`,
      to: address,
      subject: "Password Reset - Halp",
      text: "This is your new password\n" + pass
    });
  },
};

export default emailService;