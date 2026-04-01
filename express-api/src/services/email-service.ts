import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport/index.js";

const config: SMTPTransport.Options = {
    host: process.env.MAIL_HOST || "mail.rwth-aachen.de",
    port: Number(process.env.MAIL_PORT) || 587,
    secure: false, // true for port 465, false for others
    auth: {
        user: process.env.MAIL_USER || "tk812812@rwth-aachen.de",
        pass: process.env.MAIL_PASS || "rwth_Naugatuck09"
    },
}

const transporter = nodemailer.createTransport(config);

const emailService = {
    sendMailPasswordReset: (address: string, pass: string) => {
        transporter.sendMail({
            from: `"Thomas Korsten" <thomas.korsten@rwth-aachen.de>`,
            to: address,
            subject: "Password Reset - Halp",
            text: "This is your new password\n" + pass
        });
    },
};

export default emailService;