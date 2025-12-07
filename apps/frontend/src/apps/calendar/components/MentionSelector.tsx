import React, { useState, useEffect } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import clsx from "clsx";
import { Combobox } from "@headlessui/react";

interface User {
  id: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface MentionSelectorProps {
  label?: string;
  selectedUserIds: number[];
  onChange: (ids: number[]) => void;
}

export const MentionSelector: React.FC<MentionSelectorProps> = ({
  label = "Mention Users",
  selectedUserIds,
  onChange,
}) => {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Fetch ranked users
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/users/ranked");
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch (err) {
        console.error("Failed to fetch users", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers =
    query === ""
      ? users
      : users.filter((user) => {
          const name = user.display_name || user.username;
          return name.toLowerCase().includes(query.toLowerCase());
        });

  // Selected Users Objects
  const selectedUsers = users.filter((u) => selectedUserIds.includes(u.id));

  const toggleUser = (user: User) => {
    if (selectedUserIds.includes(user.id)) {
      onChange(selectedUserIds.filter((id) => id !== user.id));
    } else {
      onChange([...selectedUserIds, user.id]);
    }
  };

  const removeUser = (id: number) => {
    onChange(selectedUserIds.filter((uid) => uid !== id));
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-ink/70 mb-1">{label}</label>

      {/* Selected Tags */}
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedUsers.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-1 bg-jade/10 text-jade-dark px-2 py-1 rounded-full text-sm border border-jade/20"
          >
            {user.avatar_url && (
              <img
                src={user.avatar_url}
                alt=""
                className="w-4 h-4 rounded-full"
              />
            )}
            <span>{user.display_name || user.username}</span>
            <button
              onClick={() => removeUser(user.id)}
              className="hover:text-red-500 ml-1"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      <Combobox value={selectedUserIds} onChange={() => {}} multiple>
        <div className="relative mt-1">
          <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left border border-ink/20 focus-within:ring-2 focus-within:ring-jade/50 focus-within:border-jade sm:text-sm">
            <Combobox.Input
              className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-ink focus:ring-0 outline-none"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search users to mention..."
              displayValue={() => ""} // Clear input after selection usually, but here we just filter
            />
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronsUpDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </Combobox.Button>
          </div>
          <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-50">
            {filteredUsers.length === 0 && query !== "" ? (
              <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                Nothing found.
              </div>
            ) : (
              filteredUsers.map((user) => (
                <Combobox.Option
                  key={user.id}
                  className={({ active }) =>
                    clsx(
                      "relative cursor-default select-none py-2 pl-10 pr-4",
                      active ? "bg-jade/10 text-jade-dark" : "text-gray-900"
                    )
                  }
                  value={user.id}
                  onClick={() => toggleUser(user)} // Handle click manually for toggle behavior
                >
                  {({ selected, active }) => (
                    <>
                      <div className="flex items-center gap-2">
                        {user.avatar_url ? (
                            <img src={user.avatar_url} className="w-6 h-6 rounded-full" />
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-gray-200" />
                        )}
                        <span
                          className={clsx(
                            "block truncate",
                            selectedUserIds.includes(user.id) ? "font-medium" : "font-normal"
                          )}
                        >
                          {user.display_name || user.username}
                        </span>
                      </div>
                      {selectedUserIds.includes(user.id) ? (
                        <span
                          className={clsx(
                            "absolute inset-y-0 left-0 flex items-center pl-3",
                            active ? "text-jade-dark" : "text-jade"
                          )}
                        >
                          <Check className="h-5 w-5" aria-hidden="true" />
                        </span>
                      ) : null}
                    </>
                  )}
                </Combobox.Option>
              ))
            )}
          </Combobox.Options>
        </div>
      </Combobox>
    </div>
  );
};
