import React, { useState } from 'react';

interface NameInputProps {
  onSubmit: (name: string) => void;
}

const NameInput: React.FC<NameInputProps> = ({ onSubmit }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="あなたの名前を入力"
        className="px-4 py-2 mb-4 text-black rounded"
        maxLength={20}
      />
      <button
        type="submit"
        className="px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600"
      >
        スコアを送信
      </button>
    </form>
  );
};

export default NameInput;

