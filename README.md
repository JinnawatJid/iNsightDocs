# Vue 3 + iNsightDocs

This is a web application for handling the document flow in a credit approval process.

## Project Setup

To get started with the project, you need to install dependencies for both the frontend and the backend.

### 1. Frontend Dependencies
In the root directory:
```sh
npm install
```

### 2. Backend Dependencies
Navigate to the `backend/` directory:
```sh
cd backend
npm install
```

## Running the Application

You need to run both the backend server and the frontend development server.

### 1. Start the Backend
In a terminal, navigate to the `backend/` directory and run:
```sh
npm start
```
The backend server will run on `http://localhost:3000`. It handles database operations and API requests.

### 2. Start the Frontend
In a separate terminal (in the root directory), run:
```sh
npm run dev
```
This will start the Vite development server, typically on `http://localhost:5173`.

## How to Use the Application

The application currently supports the following workflows:

1.  **Create Credit Request**:
    -   Navigate to the root URL (e.g., `http://localhost:5173/`).
    -   Use the **Customer Search** bar to find a customer by Name or ID.
    -   The application will fetch customer data (Company vs. Individual) and pre-fill the form.
    -   Fill out the tabs: General Information, Residence/Address, Store, and Financial.
    -   Upload necessary documents in the respective tabs.

2.  **View Pending Requests**:
    -   Access the "Pending Requests" view (if enabled in navigation) to see a list of ongoing applications.

**Note**: Authentication (Login/Password) has been removed. The application is open for internal use.

## IDE Support

Learn more about IDE Support for Vue in the [Vue Docs Scaling up Guide](https://vuejs.org/guide/scaling-up/tooling.html#ide-support).
