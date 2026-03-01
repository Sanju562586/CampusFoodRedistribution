require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
    console.log("Testing email with user:", process.env.EMAIL_USER);

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER, // Send to self
        subject: 'Test Email',
        text: 'If you see this, email sending is working.'
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.response);
    } catch (error) {
        console.error('Error sending email:');
        console.error(error);
    }
}

testEmail();
