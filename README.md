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

There is no development bypass or shared administrative cookie. Database row-level security independently enforces document visibility and staff permissions.

Never commit environment files, credentials, private manuals, generated indexes, deployment metadata, or service-role keys. The repository includes only blank configuration placeholders.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Add the project URL and browser-safe publishable key.
4. Add optional response-provider credentials if needed.
5. Start the app with `npm run dev`.

An authorized account must have `app_metadata.role` set to `technician` or `admin`. Role metadata must be assigned by a trusted server-side administrator, never by the browser or user-editable metadata.

## Checks

Run `npm test`, `npm run lint`, and `npm run build` before deployment.

## Ownership

Cantek names, trademarks, logo, and documentation are the property of Cantek Soğutma Anonim Şirketi or their respective owners. No license to those assets is granted by making this source repository visible.
