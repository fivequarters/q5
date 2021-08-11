The files in this section should be used as event handlers inside the react components.

Flow should be;

1. User is shown a list of existing sessions to choose from.

    a. User can click a button to create a new session.
   
    b. User can click a button to clone an existing session (moving to create session screen with fields pre-filled).

    c. User can click on a session to continue using it.
   
    d. User can click a button to clear all sessions. (no navigation)
   
    e. User can click on a session to delete it. (no navigation)
   
2. Upon creating or cloning a session, the user is brought to a form where they must provide:
```typescript
export interface ISessionInput {
   accessToken: string;
   integrationName: string;
   tenantId: string;
}
```

3. We create a new session using these input values, and save it to local storage.

4. The user is given a prompt to click a button to begin the authentication process.  We set the callback url to a value we can handle in the next step.

5. User returns to our callback url.  We display a button that prompts the user to `commit` their session (this would normally happen invisibly, but let's make it obvious).

6. We commit the session, and show a spinner while waiting for a success response from the api.

7. We display the url that should be used to access a test endpoint on the new integration instance (this url should include tenant value, and should utilize the slack SDK)
