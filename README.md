<div align="center">

# Smart Labor Calculator

**Calculate labor rights, generate legal reports and find a lawyer under Saudi and Yemeni labor law, from any phone.**

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![TanStack Start](https://img.shields.io/badge/TanStack_Start-000000?style=flat-square)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8?style=flat-square)

</div>

---

## Overview

Smart Labor Calculator helps employees and employers work out entitlements under the Saudi Labor Law and the Yemeni Labor Law, then turn the result into a report that can be saved or shared. The interface is Arabic-first.

## Features

- **Calculator**: compute labor entitlements under the selected country law.
- **PDF reports**: preview and export a legal-style report of the calculation.
- **Knowledge base**: articles that explain labor rules in plain language.
- **Document search**: search labor-law documents by keyword.
- **Lawyer directory**: browse lawyer profiles, and lawyers can register to be listed.
- **Country selection**: switch between the supported legal systems.
- **Installable PWA**: add it to the home screen and use it like an app.
- **Admin area**: protected sign-in and password change for administrators.

> The calculator gives guidance, not legal advice. See the in-app disclaimer.

## Tech stack

| Layer | Tools |
|---|---|
| App framework | TanStack Start, TanStack Router, TanStack Query |
| UI | React, TypeScript, Tailwind CSS |
| Backend | Supabase (auth and data) |

## Getting started

```bash
git clone https://github.com/M12803/Smart-Labor.git
cd Smart-Labor
npm install
npm run dev
```

Set your Supabase URL and anon key in a local `.env` file before signing in or loading directory data.

## Author

Built by [Mohamed Adel Fouda](https://github.com/M12803), founder of PyramedX.
