'use client';

import { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

interface Props {
    onClose: () => void;
    onSuccess: () => void;
}

export default function AddModelModal({ onClose, onSuccess }: Props) {
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        model_id: '',
        name: '',
        endpoint: '',
        api_key: '',
        description: '',
        temperature: 0.7,
    });

    async function submit() {
        setLoading(true);

        const res = await fetch(`${API_BASE}/models/register-with-connector`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model_id: form.model_id,
                name: form.name,
                endpoint: form.endpoint,
                api_key: form.api_key,
                description: form.description,
                request_template: {
                    temperature: form.temperature,
                    messages: [],
                },
            }),
        });

        setLoading(false);

        if (res.ok) {
            onSuccess();
            onClose();
        } else {
            alert('Failed to register model');
        }
    }

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-[520px] p-6">
                <h2 className="text-xl font-bold mb-4">Add Model</h2>

                <div className="space-y-3">
                    <input
                        placeholder="Model Nickname"
                        className="w-full border p-2 rounded"
                        onChange={e => setForm({ ...form, name: e.target.value })}
                    />

                    <input
                        placeholder="Model ID (unique)"
                        className="w-full border p-2 rounded"
                        onChange={e => setForm({ ...form, model_id: e.target.value })}
                    />

                    <input
                        placeholder="API URL"
                        className="w-full border p-2 rounded"
                        onChange={e => setForm({ ...form, endpoint: e.target.value })}
                    />

                    <input
                        placeholder="API Key"
                        type="password"
                        className="w-full border p-2 rounded"
                        onChange={e => setForm({ ...form, api_key: e.target.value })}
                    />

                    <textarea
                        placeholder="Description"
                        className="w-full border p-2 rounded"
                        onChange={e => setForm({ ...form, description: e.target.value })}
                    />

                    <label className="text-sm text-gray-600">Temperature</label>
                    <input
                        type="number"
                        step="0.1"
                        value={form.temperature}
                        className="w-full border p-2 rounded"
                        onChange={e => setForm({ ...form, temperature: Number(e.target.value) })}
                    />
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 border rounded">
                        Cancel
                    </button>
                    <button
                        onClick={submit}
                        disabled={loading}
                        className="px-4 py-2 bg-indigo-600 text-white rounded"
                    >
                        {loading ? 'Adding...' : 'Add Model'}
                    </button>
                </div>
            </div>
        </div>
    );
}
