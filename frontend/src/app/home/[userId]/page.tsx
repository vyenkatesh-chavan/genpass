"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import axios, { AxiosError } from "axios";

// ✅ Vault entry interface
interface VaultEntry {
  _id: string;
  siteName: string;
  link: string;
  password: string;
}

// ✅ Password generator options interface
interface PasswordOptions {
  letters: number;
  numbers: number;
  symbols: number;
}

// ✅ Utility: copy text to clipboard
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Failed to copy text:", err);
    return false;
  }
};

export default function UserHomePage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.userId ?? "";

  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<VaultEntry, "_id">>({
    siteName: "",
    link: "",
    password: "",
  });
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [message, setMessage] = useState<string>("");
  const [showGenerator, setShowGenerator] = useState<boolean>(false);
  const [passwordOptions, setPasswordOptions] = useState<PasswordOptions>({
    letters: 6,
    numbers: 2,
    symbols: 2,
  });
  const [searchTerm, setSearchTerm] = useState<string>("");

  // ✅ Check authentication
  useEffect(() => {
    const storedUserId = sessionStorage.getItem("userId");
    if (!storedUserId) {
      router.push("/login");
      return;
    }

    if (storedUserId !== userId) {
      alert("You can only access your own data!");
      router.push(`/home/${storedUserId}`);
      return;
    }

    setAuthUserId(storedUserId);
    fetchUserData(storedUserId);
  }, [router, userId]);

  // ✅ Fetch user vault entries
  const fetchUserData = async (id: string) => {
    try {
      const res = await axios.get<VaultEntry[]>(
        `${process.env.NEXT_PUBLIC_API_URL}/vault/${id}`
      );
      setEntries(res.data);
    } catch (err) {
      const error = err as AxiosError;
      console.error("Error fetching user data:", error.message);
      setMessage("❌ Failed to fetch entries");
    }
  };

  // ✅ Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ Handle generator options change
  const handleGeneratorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordOptions((prev) => ({ ...prev, [name]: Number(value) }));
  };

  // ✅ Generate password
  const generatePassword = () => {
    const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*()_+{}[]<>?/|";

    let pwd = "";
    for (let i = 0; i < passwordOptions.letters; i++)
      pwd += letters[Math.floor(Math.random() * letters.length)];
    for (let i = 0; i < passwordOptions.numbers; i++)
      pwd += numbers[Math.floor(Math.random() * numbers.length)];
    for (let i = 0; i < passwordOptions.symbols; i++)
      pwd += symbols[Math.floor(Math.random() * symbols.length)];

    pwd = pwd.split("").sort(() => Math.random() - 0.5).join("");
    setForm((prev) => ({ ...prev, password: pwd }));
  };

  // ✅ Save entry
  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/save`, {
        userId,
        ...form,
      });
      setMessage("✅ Data saved successfully!");
      setForm({ siteName: "", link: "", password: "" });
      fetchUserData(userId);
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      console.error(error);
      setMessage(`❌ ${error.response?.data?.error || "Failed to save data"}`);
    }
  };

  // ✅ Delete entry
  const handleDelete = async (id: string) => {
    try {
      const res = await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/vault/${id}`);
      if (res.status === 200) {
        setEntries((prev) => prev.filter((item) => item._id !== id));
        setMessage("✅ Entry deleted successfully!");
      }
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      console.error("Delete error:", error.response?.data || error.message);
      setMessage(`❌ ${error.response?.data?.error || "Failed to delete entry"}`);
    }
  };
  

  // 🔹 Filter entries
  const filteredEntries = useMemo(
    () =>
      entries.filter((entry) =>
        entry.siteName.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [entries, searchTerm]
  );

  // ✅ Loading state
  if (!authUserId)
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br dark:from-slate-900 dark:via-blue-950 dark:to-indigo-950 from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
          <p className="dark:text-gray-300 text-gray-600 text-lg font-medium">Checking authentication...</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br dark:from-slate-900 dark:via-blue-950 dark:to-indigo-950 from-slate-50 via-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Your Vault
          </h1>
          <p className="dark:text-gray-400 text-gray-600">Securely manage your passwords</p>
        </div>

        {/* Add Entry Form */}
        <div className="dark:bg-gray-800 bg-white dark:border-gray-700 shadow-xl rounded-2xl p-8 mb-8 border border-gray-100">
          <h2 className="text-xl font-semibold dark:text-gray-100 text-gray-800 mb-6 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            Add New Entry
          </h2>

          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-2">Site Name</label>
              <input
                name="siteName"
                type="text"
                placeholder="e.g., GitHub, Gmail, Netflix"
                value={form.siteName}
                onChange={handleChange}
                className="w-full dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500 border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-2">Site URL</label>
              <input
                name="link"
                type="url"
                placeholder="https://example.com"
                value={form.link}
                onChange={handleChange}
                className="w-full dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500 border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-2">Password</label>
              <div className="flex gap-2">
                <input
                  name="password"
                  type="text"
                  placeholder="Enter or generate password"
                  value={form.password}
                  onChange={handleChange}
                  className="flex-1 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500 border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowGenerator((prev) => !prev)}
                  className="dark:bg-gradient-to-r dark:from-gray-700 dark:to-gray-600 dark:hover:from-gray-600 dark:hover:to-gray-500 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 px-5 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow"
                >
                  {showGenerator ? "Hide" : "Generate"}
                </button>
              </div>
            </div>

            {showGenerator && (
              <div className="dark:bg-gradient-to-br dark:from-gray-900 dark:to-slate-900 dark:border-gray-700 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl space-y-4 border border-blue-100 animate-in fade-in slide-in-from-top-2 duration-300">
                <h3 className="font-semibold dark:text-gray-200 text-gray-800 text-sm">Password Generator Options</h3>

                <div className="space-y-3">
                  {(["letters", "numbers", "symbols"] as (keyof PasswordOptions)[]).map((key) => (
                    <div key={key} className="flex items-center justify-between dark:bg-gray-800 dark:border-gray-700 bg-white p-3 rounded-lg shadow-sm">
                      <label className="text-sm font-medium dark:text-gray-300 text-gray-700 capitalize">{key}</label>
                      <input
                        name={key}
                        type="number"
                        min={0}
                        value={passwordOptions[key]}
                        onChange={handleGeneratorChange}
                        className="dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 border border-gray-300 p-2 w-20 rounded-md text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={generatePassword}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white w-full py-3 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Generate Password
                </button>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Save Entry
            </button>
          </form>

          {message && (
            <div
              className={`mt-5 p-4 rounded-lg text-center font-medium animate-in fade-in slide-in-from-top-1 duration-300 ${
                message.startsWith("✅")
                  ? "dark:bg-green-900 dark:text-green-300 dark:border-green-700 bg-green-50 text-green-700 border border-green-200"
                  : "dark:bg-red-900 dark:text-red-300 dark:border-red-700 bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {message}
            </div>
          )}
        </div>

        {/* Search & Saved Entries */}
        <div className="dark:bg-gray-800 dark:border-gray-700 bg-white shadow-xl rounded-2xl p-6 mb-8 border border-gray-100">
          <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-3">Search Entries</label>
          <input
            type="text"
            placeholder="Search by site name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500 border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
          />
        </div>

        <div className="dark:bg-gray-800 dark:border-gray-700 bg-white shadow-xl rounded-2xl p-8 border border-gray-100">
          <h2 className="text-xl font-semibold dark:text-gray-100 text-gray-800 mb-6 flex items-center gap-2">
            <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
            Saved Entries
            <span className="ml-auto text-sm font-normal dark:text-gray-400 text-gray-500">
              {filteredEntries.length} {filteredEntries.length === 1 ? "entry" : "entries"}
            </span>
          </h2>

          {filteredEntries.length === 0 ? (
            <div className="text-center py-12">
              <p className="dark:text-gray-400 text-gray-500 font-medium">No entries found</p>
              <p className="dark:text-gray-500 text-gray-400 text-sm mt-1">Add your first password entry above</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {filteredEntries.map((item) => (
                <li
                  key={item._id}
                  className="dark:bg-gradient-to-br dark:from-gray-900 dark:to-slate-900 dark:border-gray-700 dark:hover:border-blue-600 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-5 border border-gray-200 hover:border-blue-300 transition-all duration-200 hover:shadow-md"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 font-medium text-sm min-w-16">Site:</span>
                        <span className="dark:text-gray-100 text-gray-900 font-semibold">{item.siteName}</span>
                      </div>

                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 font-medium text-sm min-w-16">Link:</span>
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="dark:text-blue-400 dark:hover:text-blue-300 text-blue-600 hover:text-blue-700 underline break-all transition-colors"
                        >
                          {item.link}
                        </a>
                      </div>

                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 font-medium text-sm min-w-16">Password:</span>
                        <span className="dark:text-gray-100 dark:bg-gray-800 dark:border-gray-700 text-gray-900 font-mono bg-white px-3 py-1 rounded border border-gray-200">
                          {item.password}
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            if (await copyToClipboard(item.password)) {
                              setMessage("✅ Password copied to clipboard!");
                            } else {
                              setMessage("❌ Failed to copy password.");
                            }
                          }}
                          className="dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-gray-700 text-blue-500 hover:text-blue-700 p-2 rounded-full hover:bg-blue-100 transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(item._id)}
                      className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 whitespace-nowrap"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
