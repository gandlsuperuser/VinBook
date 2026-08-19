# Quick Fix for Vercel Configuration Error

## The Problem
You're seeing `login?error=Configuration` because NextAuth requires environment variables that aren't set in Vercel.

## Quick Fix (5 minutes)

### Step 1: Generate NEXTAUTH_SECRET
Run this command in your terminal:
```bash
openssl rand -base64 32
```
Copy the output (it will be a long random string).

### Step 2: Go to Vercel Dashboard
1. Visit: https://vercel.com/dashboard
2. Click on your project: **fast-keep**
3. Go to **Settings** → **Environment Variables**

### Step 3: Add These 3 Variables

**Variable 1:**
- **Name:** `NEXTAUTH_SECRET`
- **Value:** (paste the secret you generated in Step 1)
- **Environment:** ✅ Production ✅ Preview ✅ Development

**Variable 2:**
- **Name:** `NEXTAUTH_URL`
- **Value:** `https://fast-keep.vercel.app`
- **Environment:** ✅ Production ✅ Preview ✅ Development

**Variable 3:**
- **Name:** `DATABASE_URL`
- **Value:** (your PostgreSQL connection string from Neon)
- **Environment:** ✅ Production ✅ Preview ✅ Development

### Step 4: Redeploy
1. Go to **Deployments** tab
2. Click the **three dots (⋯)** on the latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete

### Step 5: Test
Visit: https://fast-keep.vercel.app/login
The configuration error should be gone!

## Still Not Working?

1. **Check Vercel Logs:**
   - Go to Deployments → Latest → Functions → View logs
   - Look for any error messages

2. **Verify Variables:**
   - Make sure variable names are exact (case-sensitive)
   - Make sure all environments are selected
   - Make sure you clicked "Save" after adding each variable

3. **Check Database:**
   - Make sure `DATABASE_URL` is correct
   - Test the connection string

## Need Help?

If you're still stuck, check:
- Vercel environment variables are set correctly
- All three required variables are present
- You've redeployed after adding variables
- Database connection is working

