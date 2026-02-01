/**
 * Google OAuth Setup Helper
 *
 * This script helps set up Google OAuth for the AI School Platform.
 * It guides you through creating OAuth credentials and updates GCP secrets.
 *
 * Usage:
 *   npx tsx scripts/setup-google-oauth.ts
 */

import * as readline from 'readline'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const PROJECT_ID = 'ai-pathshala-prod'
const REDIRECT_URI = 'https://thestai.com/api/auth/callback/google'

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

async function runGcloud(args: string): Promise<string> {
  try {
    const { stdout } = await execAsync(`gcloud ${args}`)
    return stdout.trim()
  } catch (error: unknown) {
    const err = error as { stderr?: string; message: string }
    throw new Error(err.stderr || err.message)
  }
}

async function main() {
  console.log('\n🔐 Google OAuth Setup for AI School Platform\n')
  console.log('=' .repeat(60))

  console.log('\n📋 Step 1: Create OAuth 2.0 Client ID\n')
  console.log('Please follow these steps in Google Cloud Console:\n')
  console.log('1. Open: https://console.cloud.google.com/apis/credentials?project=' + PROJECT_ID)
  console.log('2. Click "+ CREATE CREDENTIALS" → "OAuth client ID"')
  console.log('3. Select Application type: "Web application"')
  console.log('4. Name: "AI School Platform"')
  console.log('5. Under "Authorized redirect URIs", click "ADD URI"')
  console.log(`6. Enter: ${REDIRECT_URI}`)
  console.log('7. Click "CREATE"')
  console.log('\n⚠️  IMPORTANT: Copy the Client ID and Client Secret from the popup!\n')

  // Open the Cloud Console
  console.log('Opening Google Cloud Console in your browser...\n')
  const url = `https://console.cloud.google.com/apis/credentials/oauthclient?project=${PROJECT_ID}`

  try {
    // Try to open in default browser (cross-platform)
    const isWindows = process.platform === 'win32'
    const isMac = process.platform === 'darwin'

    if (isWindows) {
      await execAsync(`start "" "${url}"`)
    } else if (isMac) {
      await execAsync(`open "${url}"`)
    } else {
      await execAsync(`xdg-open "${url}"`)
    }
  } catch {
    console.log(`Could not open browser. Please open this URL manually:\n${url}\n`)
  }

  await prompt('Press Enter once you have created the OAuth client and copied the credentials...')

  console.log('\n📋 Step 2: Enter your OAuth credentials\n')

  const clientId = await prompt('Enter Client ID (ends with .apps.googleusercontent.com): ')

  if (!clientId.endsWith('.apps.googleusercontent.com')) {
    console.log('\n❌ Invalid Client ID format. It should end with .apps.googleusercontent.com')
    process.exit(1)
  }

  const clientSecret = await prompt('Enter Client Secret (starts with GOCSPX-): ')

  if (!clientSecret.startsWith('GOCSPX-')) {
    console.log('\n⚠️  Warning: Client Secret usually starts with GOCSPX-. Continuing anyway...')
  }

  console.log('\n📋 Step 3: Updating GCP Secret Manager\n')

  try {
    // Update GOOGLE_CLIENT_ID secret
    console.log('Updating GOOGLE_CLIENT_ID...')
    await runGcloud(`secrets versions add GOOGLE_CLIENT_ID --data-file=- --project=${PROJECT_ID} <<< "${clientId}"`)
    console.log('✅ GOOGLE_CLIENT_ID updated')
  } catch (error) {
    console.log('Creating GOOGLE_CLIENT_ID secret...')
    await execAsync(`echo -n "${clientId}" | gcloud secrets create GOOGLE_CLIENT_ID --data-file=- --project=${PROJECT_ID}`)
    console.log('✅ GOOGLE_CLIENT_ID created')
  }

  try {
    // Update GOOGLE_CLIENT_SECRET secret
    console.log('Updating GOOGLE_CLIENT_SECRET...')
    await runGcloud(`secrets versions add GOOGLE_CLIENT_SECRET --data-file=- --project=${PROJECT_ID} <<< "${clientSecret}"`)
    console.log('✅ GOOGLE_CLIENT_SECRET updated')
  } catch (error) {
    console.log('Creating GOOGLE_CLIENT_SECRET secret...')
    await execAsync(`echo -n "${clientSecret}" | gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=- --project=${PROJECT_ID}`)
    console.log('✅ GOOGLE_CLIENT_SECRET created')
  }

  console.log('\n📋 Step 4: Deploying new revision\n')
  console.log('The secrets have been updated. To apply them, you need to deploy a new revision.')
  console.log('You can either:')
  console.log('  a) Push a commit to main branch (triggers CI/CD)')
  console.log('  b) Run: gcloud run deploy ai-pathshala --region=asia-south1 --image=CURRENT_IMAGE')
  console.log('\nAlternatively, I can trigger a redeployment now.\n')

  const redeploy = await prompt('Would you like to redeploy now? (y/n): ')

  if (redeploy.toLowerCase() === 'y') {
    console.log('\nTriggering redeployment...')
    try {
      const result = await execAsync(`gcloud run services update ai-pathshala --region=asia-south1 --project=${PROJECT_ID} --update-env-vars=OAUTH_UPDATED=${Date.now()}`)
      console.log('✅ Redeployment triggered!')
      console.log(result.stdout)
    } catch (error) {
      console.log('❌ Could not trigger redeployment automatically.')
      console.log('Please redeploy manually or push a commit.')
    }
  }

  console.log('\n' + '=' .repeat(60))
  console.log('\n✅ Setup complete!\n')
  console.log('Next steps:')
  console.log('1. Wait for deployment to complete (1-2 minutes)')
  console.log('2. Test Google OAuth at: https://thestai.com/login')
  console.log('3. Click "Continue with Google" to verify it works\n')
}

main().catch((error) => {
  console.error('\n❌ Error:', error.message)
  process.exit(1)
})
