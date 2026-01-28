import axios from 'axios';

const API_URL = 'https://4bsc.ai/api';

export async function getNonce(addr) {
    try {
        const response = await axios.post(`${API_URL}/front/login/wallet`, {
            addr
        });
        return response.data;
    } catch (error) {
        console.error('Get nonce failed:', error);
        return null;
    }
}

export async function login(addr, signature, nonce) {
    try {
        const response = await axios.post(`${API_URL}/front/login/auth_wallet`, {
            addr,
            signature,
            nonce
        });
        return response.data;
    } catch (error) {
        console.error('Login failed:', error);
        return null;
    }
}

export async function setInviter(session_token) {
    try {
        const response = await axios.get(`${API_URL}/front/set/user/invite_by?invited_by=tr0N74`, {
            headers: {
                'authorization': `Bearer ${session_token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Set inviter failed:', error);
        return null;
    }
}

export async function getUserData(session_token) {
    try {
        const response = await axios.get(`${API_URL}/front/get/finaltest/farm`, {
            headers: {
                'authorization': `Bearer ${session_token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Get user data failed:', error);
        return null;
    }
}

export async function verifyDailyTask(session_token) {
    try {
        const response = await axios.post(`${API_URL}/front/get/finaltest/verify_daily_task`, {}, {
            headers: {
                'authorization': `Bearer ${session_token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Verify daily task failed:', error);
        return null;
    }
}

export async function createNewAgent(session_token, name, description) {
    const payload = {
        "name": name,
        "tag": [0],
        "description": description
    }
    try {
        const response = await axios.post(`${API_URL}/front/create/repositories`, payload, {
            headers: {
                'authorization': `Bearer ${session_token}`
            }
        });
        return response.data;
    }
    catch (error) {
        console.error('Create new agent failed:', error);
        return null;
    }
}

export async function createNewRequest(session_token, title, description) {
    const payload = {
        title,
        "content": `[{\"children\":[{\"text\":\"${description}\"}],\"id\":\"Yu5ECs9eNB\",\"type\":\"p\"}]`,
        "is_mobile": false
    }
    try {
        const response = await axios.post(`${API_URL}/front/create/request`, payload, {
            headers: {
                'authorization': `Bearer ${session_token}`
            }
        });
        return response.data;
    }
    catch (error) {
        console.error('Create new request failed:', error);
        return null;
    }
}
