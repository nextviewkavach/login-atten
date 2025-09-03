import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
import * as cheerio from 'cheerio';
import nodemailer from 'nodemailer';
import cron from 'node-cron';

// --- CONFIGURATION ---
const BASE_URL = 'http://103.186.19.214:86';
const ACTIVITY_PAGE_URL = `${BASE_URL}/?p=SLN8t5i`;
const LOGIN_URL = `${BASE_URL}/Activity/Login`;
const LOGOUT_URL = `${BASE_URL}/Activity/Logout`;

// Use Environment Variables for sensitive data
const EMAIL_CONFIG = {
    host: "smtp-relay.brevo.com",
    port: 587,
    auth: {
        user: process.env.SMTP_USER || "asnewwinter@gmail.com",
        pass: process.env.SMTP_PASS || "MyaZH0s9zB3b5DWQ" // It's better to use Railway variables
    },
    from: "NextView Monitor <monitor@nextviewkavach.in>",
    to: "asnewwinter@gmail.com"
};

// Create a single axios instance that automatically handles cookies
const cookieJar = new CookieJar();
const client = wrapper(axios.create({ jar: cookieJar, timeout: 15000 })); // 15-second timeout

// --- 1. REUSABLE EMAIL FUNCTION ---
async function sendNotification(subject, text) {
    console.log(`Sending email: "${subject}"`);
    try {
        const transporter = nodemailer.createTransport(EMAIL_CONFIG);
        await transporter.sendMail({
            from: EMAIL_CONFIG.from,
            to: EMAIL_CONFIG.to,
            subject: subject,
            text: text || subject // Use subject as text if no text is provided
        });
        console.log('✅ Email sent successfully.');
    } catch (error) {
        console.error('❌ Failed to send email:', error.message);
    }
}

// --- 2. CORE FUNCTIONS (CHECK, LOGIN, LOGOUT) ---

/**
 * Checks if the website is currently online and accessible.
 * @returns {Promise<boolean>} - True if the site is up, false otherwise.
 */
async function checkWebsiteStatus() {
    try {
        await client.get(ACTIVITY_PAGE_URL);
        console.log('✅ Website is online.');
        return true;
    } catch (error) {
        console.error('❌ Website is DOWN! Error:', error.message);
        return false;
    }
}

/**
 * Performs the full login sequence.
 */
async function performLogin() {
    console.log('--- Attempting to LOGIN ---');
    try {
        const pageResponse = await client.get(ACTIVITY_PAGE_URL);
        const $ = cheerio.load(pageResponse.data);
        const token = $('form[action="/Activity/Login"] input[name="__RequestVerificationToken"]').val();

        if (!token) throw new Error("Could not find login token.");

        const loginData = new URLSearchParams({ '__RequestVerificationToken': token, 'password': 'SLN8t5i' });
        await client.post(LOGIN_URL, loginData);
        
        console.log('🎉 Login Successful!');
        await sendNotification('✅ Successful Login at 9:30 AM', 'The automated script has successfully logged in.');
    } catch (error) {
        console.error('❌ LOGIN FAILED:', error.message);
        await sendNotification('❌ Login Failed at 9:30 AM', `The script failed to log in. Error: ${error.message}`);
    }
}

/**
 * Performs the full logout sequence.
 */
async function performLogout() {
    console.log('--- Attempting to LOGOUT ---');
    try {
        const pageResponse = await client.get(ACTIVITY_PAGE_URL);
        const $ = cheerio.load(pageResponse.data);
        const token = $('form[action="/Activity/Logout"] input[name="__RequestVerification_Token"]').val();
        
        if (!token) throw new Error("Could not find logout token.");
        
        const logoutData = new URLSearchParams({ '__RequestVerificationToken': token, 'password': 'SLN8t5i' });
        await client.post(LOGOUT_URL, logoutData);
        
        console.log('👋 Logout Successful!');
        await sendNotification('👋 Successful Logout at 6:30 PM', 'The automated script has successfully logged out.');
    } catch (error) {
        console.error('❌ LOGOUT FAILED:', error.message);
        await sendNotification('❌ Logout Failed at 6:30 PM', `The script failed to log out. Error: ${error.message}`);
    }
}


// --- 3. MAIN SCRIPT LOGIC ---

async function startService() {
    console.log('🚀 Service starting...');
    
    // Perform initial check on startup
    const isLive = await checkWebsiteStatus();
    if (isLive) {
        await sendNotification('✅ Website is Live', 'The monitoring service has started and the website is accessible.');
    } else {
        await sendNotification('🔥 URGENT: Website is DOWN on startup!', 'The monitoring service started, but the website is not accessible.');
    }

    console.log('🕒 Schedulers are being set up...');

    // All schedules are in Indian Standard Time (IST)
    const timeZone = 'Asia/Kolkata';

    // Schedule 1: Login at 9:30 AM IST every day
    cron.schedule('30 9 * * *', performLogin, { timezone: timeZone });

    // Schedule 2: Logout at 18:30 (6:30 PM) IST every day
    cron.schedule('30 18 * * *', performLogout, { timezone: timeZone });

    // Schedule 3: Monitor every 30 minutes
    cron.schedule('*/30 * * * *', async () => {
        console.log('🕒 [Monitor] Checking website status...');
        const isStillLive = await checkWebsiteStatus();
        if (!isStillLive) {
            await sendNotification('🔥 URGENT: Website is DOWN!', 'The 30-minute check failed. The website is not accessible.');
        }
    }, { timezone: timeZone });
    
    console.log('✅ All jobs scheduled. The service is now running.');
}

// Start the whole process
startService();