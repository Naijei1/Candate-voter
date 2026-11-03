# Running cost

This repo does not meter a bill. The figures below are the cost shape, not a quote.

- Amplify Hosting WEB_COMPUTE serves the Next.js app. Cost follows request traffic and build minutes. There is no static-export CDN-only mode.
- DynamoDB on-demand tables `candate-voter` and `candate-voter-users` charge for storage and requests. The Kentucky seed is a small write. Point-in-time recovery is on for the filing table.
- FEC OpenFEC reads are free with an API key. The key stays on the ingest Lambda, not on Amplify.
- Kentucky Lantern is a public RSS feed. No news vendor contract.
- No poll vendor, no email service, and no paid photo license. Official House portraits are stored as files.
- Cognito user-pool pricing applies only when people sign in. Google sign-in stays off until a client id and secret are set.
- A quiet pilot is dominated by the Amplify app plus near-zero DynamoDB traffic. A busy election night raises Amplify request cost, not a data-vendor invoice.

Do not put `FEC_API_KEY` or `AWS_REGION` on the Amplify app.
