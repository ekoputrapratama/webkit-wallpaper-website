# WebKit Wallpaper Themes

A community hub for uploading, browsing, downloading, and rating themes for [**webkit-wallpaper**](https://github.com/ekoputrapratama/webkit_wallpaper) and [**webwallpaper-kde**](https://github.com/ekoputrapratama/webwallpaper-kde). Users submit a theme package (a `.zip` containing an `index.html` plus assets), and everyone else can browse, search, download, like, and comment on them — all in one place.

## Features

- **Community theme gallery** — browse all submitted themes with search by name, tag, or author
- **Tag filtering** — click any tag to filter the gallery by it
- **Sorting** — newest, most downloaded, and most liked
- **Theme submission** — upload a thumbnail preview and a `.zip` package with a name, description, and tags
- **Edit / delete your own themes** — manage them from your profile
- **Likes & comments** — interact with themes, with per-user duplicate-like protection
- **Download counter** — every download is tracked and shown on the theme page
- **Author profiles** — dedicated pages for each contributor with their bio and themes
- **Donations** — creators can attach a Ko-fi / Buy Me a Coffee / PayPal link to their themes
- **Secure accounts** — email/password authentication; users can only edit their own content (enforced by Firestore security rules)

## Tech Stack

| Layer    | Technology                                   |
| -------- | -------------------------------------------- |
| Frontend | React 18 + Vite                              |
| Backend  | Firebase (Auth, Firestore, Storage, Hosting) |
| Testing  | Vitest + React Testing Library               |
| CI/CD    | GitHub Actions                               |

## Getting Started

### Prerequisites

- Node.js 18+ (npm)
- A Firebase project with email/password **Authentication**, a **Firestore** database, **Storage**, and **Hosting**

### 1. Install dependencies

```sh
npm install
```

### 2. Configure environment variables

Copy the Firebase web-app configuration into a `.env` file at the project root:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIRESTORE_DATABASE_ID=your-database-id
```

### 3. Run the dev server

```sh
npm run dev
```

## Building

```sh
npm run build
# serve the production build
npm run preview
```

## Testing

Tests live in the `tests/` folder and cover login, registration, theme submission/updating, and the Firestore like/download logic (Firebase is mocked).

```sh
npm test        # run once
npm run test:watch   # watch mode
```

## Deploying to Firebase

Make sure the Firebase CLI is authenticated and the target alias is configured:

```sh
npx firebase deploy --only hosting:prod --project <project-id>
```

## CI/CD

The workflow in `.github/workflows/ci.yml` runs the test suite on every push/PR to `main` and deploys to Firebase Hosting on pushes to `main`. The following repository secrets must be configured:

- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIRESTORE_DATABASE_ID`
- `FIREBASE_TOKEN` — generate one with `npx firebase login:ci`

## Security Rules

Sensible Firestore security rules are included in `firestore.rules`:

- Wallpapers are publicly readable; only their owner can edit/delete them
- Any authenticated user can increment the download counter (nothing else)
- Users can only create/update their own profile document
- Likes and comments are owner-only for writes, public for reads

Deploy the rules with:

```sh
npx firebase deploy --only firestore:rules --project <project-id>
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feat/my-feature`)
5. Open a pull request

## License

[MIT](LICENSE)
