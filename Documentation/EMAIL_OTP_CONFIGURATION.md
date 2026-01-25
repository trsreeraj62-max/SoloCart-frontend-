# 📧 Email/OTP Configuration Guide

## 🎯 Issue
Emails with OTP and other notifications are not being sent to user email addresses.

## 🔍 Root Cause
Laravel backend needs email service configuration (SMTP credentials) to send emails.

---

## ✅ Solution: Configure Email Service

### Option 1: Mailtrap (Recommended for Testing)
**Free tier available, perfect for development**

1. **Create Mailtrap Account:**
   - Go to https://mailtrap.io
   - Sign up for free account
   - Create new inbox

2. **Get SMTP Credentials:**
   - Go to your inbox
   - Click "Show Credentials"
   - Copy SMTP settings

3. **Update Backend .env on Render:**
   ```env
   MAIL_MAILER=smtp
   MAIL_HOST=sandbox.smtp.mailtrap.io
   MAIL_PORT=2525
   MAIL_USERNAME=your_mailtrap_username
   MAIL_PASSWORD=your_mailtrap_password
   MAIL_ENCRYPTION=tls
   MAIL_FROM_ADDRESS=noreply@solocart.com
   MAIL_FROM_NAME="SoloCart"
   ```

### Option 2: Gmail SMTP (For Production)
**Use for real email delivery**

1. **Enable 2-Factor Authentication:**
   - Go to Google Account settings
   - Enable 2FA

2. **Generate App Password:**
   - Go to https://myaccount.google.com/apppasswords
   - Create new app password for "Mail"
   - Copy the 16-character password

3. **Update Backend .env on Render:**
   ```env
   MAIL_MAILER=smtp
   MAIL_HOST=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USERNAME=your-email@gmail.com
   MAIL_PASSWORD=your-16-char-app-password
   MAIL_ENCRYPTION=tls
   MAIL_FROM_ADDRESS=your-email@gmail.com
   MAIL_FROM_NAME="SoloCart"
   ```

### Option 3: SendGrid (Scalable Production)
**Professional email service**

1. **Create SendGrid Account:**
   - Go to https://sendgrid.com
   - Sign up (free tier: 100 emails/day)

2. **Create API Key:**
   - Go to Settings → API Keys
   - Create new API key
   - Copy the key

3. **Update Backend .env on Render:**
   ```env
   MAIL_MAILER=smtp
   MAIL_HOST=smtp.sendgrid.net
   MAIL_PORT=587
   MAIL_USERNAME=apikey
   MAIL_PASSWORD=your-sendgrid-api-key
   MAIL_ENCRYPTION=tls
   MAIL_FROM_ADDRESS=noreply@solocart.com
   MAIL_FROM_NAME="SoloCart"
   ```

---

## 🔧 How to Update on Render

### Step 1: Access Render Dashboard
1. Go to https://dashboard.render.com
2. Find your backend service (solocart-backend)
3. Click on the service

### Step 2: Update Environment Variables
1. Click "Environment" tab
2. Add/Update these variables:
   - `MAIL_MAILER`
   - `MAIL_HOST`
   - `MAIL_PORT`
   - `MAIL_USERNAME`
   - `MAIL_PASSWORD`
   - `MAIL_ENCRYPTION`
   - `MAIL_FROM_ADDRESS`
   - `MAIL_FROM_NAME`

### Step 3: Save and Redeploy
1. Click "Save Changes"
2. Render will automatically redeploy
3. Wait for deployment to complete (~2-3 minutes)

---

## 🧪 Testing Email Functionality

### Test 1: User Registration with OTP
1. Go to frontend registration page
2. Enter email address
3. Submit registration form
4. **Expected:** Receive OTP email
5. Check email inbox (or Mailtrap inbox)
6. Verify OTP code received
7. Enter OTP to complete registration

### Test 2: Password Reset
1. Go to "Forgot Password" page
2. Enter email address
3. Submit form
4. **Expected:** Receive password reset email
5. Check email inbox
6. Click reset link
7. Set new password

### Test 3: Order Confirmation
1. Place an order as customer
2. Complete checkout
3. **Expected:** Receive order confirmation email
4. Check email inbox
5. Verify order details in email

---

## 📋 Email Templates to Verify

Your backend should have these email templates:

1. **OTP Verification** (`resources/views/emails/otp.blade.php`)
   - Sent during registration
   - Contains 6-digit OTP code

2. **Welcome Email** (optional)
   - Sent after successful registration

3. **Order Confirmation** (optional)
   - Sent after order placement
   - Contains order details

4. **Password Reset** (optional)
   - Sent when user requests password reset

---

## 🐛 Troubleshooting

### Issue: Emails still not sending
**Check:**
1. ✅ Environment variables saved on Render
2. ✅ Backend redeployed after changes
3. ✅ SMTP credentials are correct
4. ✅ No typos in email configuration
5. ✅ Check Render logs for email errors

### Issue: Emails going to spam
**Solution:**
- Use verified sender email
- Add SPF/DKIM records (for production)
- Use professional email service (SendGrid)

### Issue: Gmail blocking login
**Solution:**
- Use App Password (not regular password)
- Enable "Less secure app access" (not recommended)
- Use SendGrid or Mailtrap instead

---

## 📊 Recommended Configuration

### For Development/Testing:
```env
# Use Mailtrap - all emails caught in inbox
MAIL_MAILER=smtp
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your_mailtrap_username
MAIL_PASSWORD=your_mailtrap_password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@solocart.com
MAIL_FROM_NAME="SoloCart"
```

### For Production:
```env
# Use SendGrid - reliable delivery
MAIL_MAILER=smtp
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USERNAME=apikey
MAIL_PASSWORD=your_sendgrid_api_key
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@solocart.com
MAIL_FROM_NAME="SoloCart"
```

---

## 🎯 Quick Start (Fastest Setup)

### Using Mailtrap (5 minutes):
1. Sign up at https://mailtrap.io
2. Get SMTP credentials from inbox
3. Add to Render environment variables
4. Redeploy backend
5. Test registration with OTP
6. Check Mailtrap inbox for email

---

## ✅ Success Checklist

- [ ] Email service chosen (Mailtrap/Gmail/SendGrid)
- [ ] SMTP credentials obtained
- [ ] Environment variables added to Render
- [ ] Backend redeployed
- [ ] Registration tested
- [ ] OTP email received
- [ ] OTP verification works
- [ ] Order confirmation emails work (if applicable)

---

## 📞 Next Steps

1. **Choose email service** (Mailtrap recommended for testing)
2. **Get SMTP credentials**
3. **Update Render environment variables**
4. **Wait for redeploy**
5. **Test OTP functionality**
6. **Verify all emails working**

---

**Status**: 📧 Ready to configure email service!
**Estimated Time**: 5-10 minutes
**Difficulty**: Easy ✅

Let me know which email service you'd like to use, and I can provide more specific instructions!
