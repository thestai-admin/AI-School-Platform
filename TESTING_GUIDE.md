# AI Pathshala - Feature Testing Guide

**Live URL:** https://thestai.com

---

## Test Accounts

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@thestai.com | AIPathshala2026! |
| **Teacher** | testteacher@thestai.com | TestTeacher2026! |
| **Student** | teststudent@thestai.com | TestStudent2026! |

---

## 1. Authentication Testing

### 1.1 Login
1. Go to https://thestai.com/login
2. Enter credentials for any test account
3. Click "Sign In"
4. **Expected:** Redirect to role-specific dashboard

### 1.2 Logout
1. Click profile icon or menu
2. Click "Logout"
3. **Expected:** Redirect to login page

### 1.3 Role-Based Access
- Login as Student, try accessing /teacher/* - **Expected:** Unauthorized
- Login as Teacher, try accessing /admin/* - **Expected:** Unauthorized
- Login as Admin, access any route - **Expected:** Allowed

---

## 2. Admin Features

### 2.1 Dashboard
1. Login as admin@thestai.com
2. Go to /admin
3. **Expected:** See school overview, user counts, recent activity

### 2.2 User Management
1. Go to /admin/users
2. View list of teachers and students
3. **Expected:** See all users with roles

### 2.3 Class Management
1. Go to /admin/classes
2. View/create classes (Class 1-10)
3. **Expected:** CRUD operations work

---

## 3. Teacher Features

### 3.1 AI Lesson Plan Generator
1. Login as testteacher@thestai.com
2. Go to /teacher/lessons/new
3. Fill in:
   - Grade: 5
   - Subject: Mathematics
   - Topic: "Addition of Fractions"
   - Duration: 45 minutes
4. Click "Generate Lesson Plan"
5. **Expected:** AI generates detailed lesson plan with:
   - Learning objectives
   - Teaching activities
   - Board notes
   - Assessment questions

### 3.2 AI Worksheet Generator
1. Go to /teacher/worksheets/new
2. Fill in:
   - Grade: 5
   - Subject: Mathematics
   - Topic: "Multiplication Tables"
   - Difficulty: Medium
   - Number of Questions: 10
3. Click "Generate Worksheet"
4. **Expected:** AI generates worksheet with:
   - Mixed question types
   - Progressive difficulty
   - Answer key

### 3.3 Homework Assignment
1. Go to /teacher/homework
2. Click "Create Homework"
3. Fill in:
   - Title: "Math Practice"
   - Class: Select a class
   - Subject: Mathematics
   - Due Date: Tomorrow
   - Questions: Add manually or use AI-generated
4. Click "Assign"
5. **Expected:** Homework visible to students in that class

### 3.4 Student Progress
1. Go to /teacher/students
2. Select a student
3. **Expected:** View student's:
   - Subject-wise progress
   - Homework submissions
   - AI chat history

---

## 4. Student Features

### 4.1 AI Chat (Doubt Solving)
1. Login as teststudent@thestai.com
2. Go to /student/chat
3. Select subject: Mathematics
4. Ask: "What is 2+2?"
5. **Expected:** AI responds with answer and explanation
6. Ask: "Explain fractions with an example"
7. **Expected:** Detailed, student-friendly explanation

### 4.2 View Worksheets
1. Go to /student/worksheets
2. **Expected:** See worksheets assigned by teachers
3. Click on a worksheet
4. **Expected:** View questions and submit answers

### 4.3 Homework Submission
1. Go to /student/homework
2. View assigned homework
3. Click on homework to open
4. Answer questions
5. Click "Submit"
6. **Expected:**
   - Homework marked as submitted
   - AI auto-grades (if enabled)
   - Feedback displayed

### 4.4 Progress Dashboard
1. Go to /student/progress
2. **Expected:** See:
   - Subject-wise scores
   - Recent submissions
   - Areas for improvement

---

## 5. Parent Features

### 5.1 Child Progress View
1. Login as parent (create via admin)
2. Go to /parent
3. **Expected:** See linked child's:
   - Overall performance
   - Recent homework
   - Teacher feedback

---

## 6. API Testing (via curl)

### 6.1 Health Check
```bash
curl https://thestai.com/api/health
```
**Expected:** `{"status":"ok"}`

### 6.2 AI Chat API
```bash
# First get CSRF token and login cookies via browser
curl -X POST https://thestai.com/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_SESSION_COOKIE" \
  -d '{"message":"What is 5+5?","subject":"Mathematics","language":"ENGLISH"}'
```
**Expected:** JSON with AI response

### 6.3 Lesson Generation API
```bash
curl -X POST https://thestai.com/api/ai/lesson \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_SESSION_COOKIE" \
  -d '{"grade":5,"subject":"Mathematics","topic":"Fractions","language":"ENGLISH","duration":30}'
```
**Expected:** JSON with lesson plan

### 6.4 Worksheet Generation API
```bash
curl -X POST https://thestai.com/api/ai/worksheet \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_SESSION_COOKIE" \
  -d '{"grade":5,"subject":"Mathematics","topic":"Addition","difficulty":"EASY","questionCount":5,"language":"ENGLISH"}'
```
**Expected:** JSON with questions array

---

## 7. Edge Cases to Test

### 7.1 Rate Limiting
- Make 25+ AI requests in 1 minute
- **Expected:** 429 Too Many Requests after limit

### 7.2 Invalid Input
- Submit empty form fields
- **Expected:** Validation errors displayed

### 7.3 Session Expiry
- Login, wait 24+ hours, try action
- **Expected:** Redirect to login

### 7.4 Concurrent Users
- Login same account in two browsers
- **Expected:** Both sessions work independently

---

## 8. Performance Checks

| Action | Expected Time |
|--------|---------------|
| Page Load | < 2 seconds |
| AI Chat Response | < 5 seconds |
| Lesson Generation | < 15 seconds |
| Worksheet Generation | < 10 seconds |
| Homework Submission | < 3 seconds |

---

## 9. Mobile Testing

Test all features on:
- Mobile Chrome (Android)
- Mobile Safari (iOS)
- Tablet

**Expected:** Responsive design, all features functional

---

## Quick Test Script

Run this to test basic AI functionality:

```bash
# Save as test-quick.sh
#!/bin/bash

echo "Testing AI Pathshala..."

# Health check
echo "1. Health Check:"
curl -s https://thestai.com/api/health
echo ""

# Get CSRF (you'll need to complete login manually)
echo ""
echo "2. Visit https://thestai.com/login"
echo "   Login as: teststudent@thestai.com / TestStudent2026!"
echo "   Then test AI Chat at /student/chat"
echo ""
echo "3. Visit https://thestai.com/login"
echo "   Login as: testteacher@thestai.com / TestTeacher2026!"
echo "   Then test Lesson Generator at /teacher/lessons/new"

echo ""
echo "Testing complete!"
```

---

## Reporting Issues

If you find bugs:
1. Note the exact steps to reproduce
2. Screenshot any error messages
3. Check browser console for errors (F12)
4. Report at: https://github.com/thestai-admin/AI-School-Platform/issues
