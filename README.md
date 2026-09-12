# Cantek Diagnostics

Cantek Diagnostics helps customers and authorized technicians find relevant information in approved Cantek service documents.

Maintainer: [cankaracx](https://github.com/cankaracx)

## Main features

- Multilingual diagnostic interface with English, Turkish, Arabic, French, Russian, and Spanish support.
- Document-grounded responses with source title and page references.
- Protected technician and administrator areas.
- Role-based access to public and internal documents.
- PDF, DOCX, Markdown, and text ingestion for authorized administrators.
- Safety boundaries for emergency and hazardous-service requests.
- Terms, privacy and KVKK notice, cookie notice, safety notice, and accessibility statement.

## Security model

Staff access uses Supabase Auth. Authorization is read only from server-controlled `app_metadata`:

- `technician` can use the technician desk and create handoff records.
- `admin` can also upload and manage documents.
- `super_admin` inherits administrator permissions and is the only role accepted by the username-only `/admin` sign-in.

Verified customer accounts are optional and receive no staff role. Diagnostics remain available to guests.

There is no development bypass or shared administrative cookie. Database row-level security independently enforces document visibility and staff permissions.

Never commit environment files, credentials, private manuals, generated indexes, deployment metadata, or service-role keys. The repository includes only blank configuration placeholders.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Add the project URL, browser-safe publishable key, server-only service-role key, and `NEXT_PUBLIC_SITE_URL`.
4. Start the app with `npm run dev`.
5. Sign in at `/admin` as the super administrator (username `admin`). On the right, open **Provider connections**, select Anthropic, OpenAI, Google Gemini, xAI, Groq, Mistral, or OpenRouter, paste that provider’s API key, then choose **Test and save key**. Keys are stored in the private database schema and only a masked status is returned to the browser. For local-only development, the matching server environment variable (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `XAI_API_KEY`, `GROQ_API_KEY`, `MISTRAL_API_KEY`, or `OPENROUTER_API_KEY`) remains a fallback.

Never expose `SUPABASE_SERVICE_ROLE_KEY` or a provider API key through a
`NEXT_PUBLIC_` variable.

An authorized staff account must have `app_metadata.role` set to `technician`, `admin`, or `super_admin`. Role metadata must be assigned through the supported Auth administration interface or Admin API, never by the browser, user-editable metadata, or a direct write to the Auth schema.

## One-time super administrator setup

1. In the hosted Auth dashboard, create an undisclosed email identity for the super administrator. Mark the email as confirmed and use a temporary strong password.
2. In the same trusted administration interface, set the user's application metadata to `{ "role": "super_admin" }`.
3. Store that undisclosed email only in the deployment secret `SUPER_ADMIN_EMAIL`; never put it in source control or client-visible variables.
4. Sign in at `/admin` with username `admin`, then rotate the temporary password immediately.

For customer verification, keep email confirmation enabled. Configure the production Site URL and allow both the production and local `/auth/confirm` redirect URLs. The confirmation email link should use:

`{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email`

Use Cantek-branded copy in the email template and do not expose infrastructure identifiers.

## Checks

Run `npm test`, `npm run lint`, and `npm run build` before deployment.

## Ownership

Cantek names, trademarks, logo, and documentation are the property of Cantek Soğutma Anonim Şirketi or their respective owners. No license to those assets is granted by making this source repository visible.
