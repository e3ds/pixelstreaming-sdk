/**
 * login.js - sign in, receive a session token from our own server, start the stream.
 *
 * The page never holds the Streaming API key. After a correct username and
 * password, login/server.js asks Eagle 3D Streaming for a single-use session
 * token and returns it here; the SDK is started with that token, exactly as
 * ../scripts/sdk-token.js does in the plain demo.
 */
const form = document.getElementById('login');
const errorBox = document.getElementById('error');
const submit = document.getElementById('submit');
const stream = document.getElementById('stream');

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.textContent = '';
    submit.disabled = true;
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: document.getElementById('username').value.trim(),
                password: document.getElementById('password').value
            })
        });
        const answer = await response.json().catch(() => ({}));
        if (!response.ok || !answer.ok) {
            errorBox.textContent = answer.error || 'Sign-in failed.';
            return;
        }
        // Correct login: show the player and start it with the token the server got for us.
        form.style.display = 'none';
        stream.style.display = 'block';
        e3ds_controller.main({ ...answer.tokenData, client: answer.client });
    } catch (e) {
        errorBox.textContent = 'Could not reach the login server.';
    } finally {
        submit.disabled = false;
        document.getElementById('password').value = '';
    }
});

document.getElementById('signOut').addEventListener('click', () => {
    // Ends the session on the platform and frees the machine.
    try { e3ds_controller.terminate(); } catch (e) { /* already ended */ }
    // The player builds its UI inside #playerUI; start from a clean page for the next login.
    location.reload();
});
