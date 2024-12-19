import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RankingEntry {
  Name: string;
  Score: number;
  Stage: number;
  Timestamp: string;
}

interface RankingDemoProps {
  initialScore: number;
  onBack: () => void;
}

const RankingDemo: React.FC<RankingDemoProps> = ({ initialScore, onBack }) => {
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const PAGE_SIZE = 5;

  useEffect(() => {
    const fetchRankings = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('https://script.google.com/macros/s/AKfycbyQp_py847USyAEKH8D6nuFnJBEcyu8r7ry75za0VpPCl7UoORYdIZRPtIcsSNYCBPf/exec');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error('Error parsing JSON:', e);
          console.log('Received text:', text);
          throw new Error('Invalid JSON response');
        }
        if (!Array.isArray(data)) {
          console.error('Received data is not an array:', data);
          throw new Error('Invalid data format received');
        }
        setRankings(data);
      } catch (err) {
        setError('Failed to load rankings. Please try again later.');
        console.error('Error fetching rankings:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRankings();
  }, []);

  const filteredRankings = useMemo(() => {
    if (!searchQuery) return rankings;
    return rankings.filter(rank => 
      rank.Score.toString().includes(searchQuery) ||
      rank.Stage.toString().includes(searchQuery)
    );
  }, [rankings, searchQuery]);

  const totalPages = Math.ceil(filteredRankings.length / PAGE_SIZE);
  const currentRankings = filteredRankings.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE
  );

  // Add this check
  if (rankings.length === 0 && !isLoading && !error) {
    return (
      <div className="text-center py-4">
        No rankings available. Be the first to set a high score!
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="bg-white rounded-lg p-4 w-96 mx-auto">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-bold">ランキング TOP 100</h2>
          <div className="text-xs text-gray-500">
            {currentPage * PAGE_SIZE + 1}位〜{Math.min((currentPage + 1) * PAGE_SIZE, filteredRankings.length)}位
          </div>
        </div>

        <div className="mb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(0);
            }}
            placeholder="スコアまたはステージで検索..."
            className="w-full px-3 py-1 border rounded text-sm"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-4">ランキングを読み込み中...</div>
        ) : error ? (
          <div className="text-center text-red-500 py-4">{error}</div>
        ) : (
          <div className="space-y-1 mb-3">
            {currentRankings.map((entry, index) => {
              const rankNum = currentPage * PAGE_SIZE + index + 1;
              return (
                <div
                  key={entry.Name + entry.Timestamp}
                  className={`flex items-center justify-between p-2 rounded text-sm ${
                    rankNum <= 3 ? 'bg-yellow-50' :
                    rankNum <= 10 ? 'bg-blue-50' :
                    index % 2 === 0 ? 'bg-gray-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold w-6 text-right">
                      {rankNum === 1 && '🥇'}
                      {rankNum === 2 && '🥈'}
                      {rankNum === 3 && '🥉'}
                      {rankNum > 3 && `${rankNum}.`}
                    </span>
                    <div>
                      <div className="font-medium">{entry.Name}</div>
                      <div className="text-xs text-gray-500">Stage {entry.Stage}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{entry.Score.toLocaleString()} pts</div>
                    <div className="text-xs text-gray-500">
                      {new Date(entry.Timestamp).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}

            {currentRankings.length === 0 && (
              <div className="text-center text-gray-500 py-4">
                該当するランキングが見つかりません
              </div>
            )}
          </div>
        )}

        <div className="flex justify-center gap-1 mb-3">
          <button
            onClick={() => setCurrentPage(0)}
            disabled={currentPage === 0}
            className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            ≪
          </button>
          {[...Array(Math.min(totalPages, 7))].map((_, i) => {
            let pageNum = i;
            if (totalPages > 7) {
              if (currentPage < 4) {
                pageNum = i;
              } else if (currentPage > totalPages - 4) {
                pageNum = totalPages - 7 + i;
              } else {
                pageNum = currentPage - 3 + i;
              }
            }
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-6 h-6 text-xs rounded ${
                  currentPage === pageNum 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {pageNum + 1}
              </button>
            );
          })}
          <button
            onClick={() => setCurrentPage(totalPages - 1)}
            disabled={currentPage === totalPages - 1}
            className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            ≫
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3 p-2 bg-gray-50 rounded text-xs">
          <div className="text-center">
            <div className="text-gray-600">平均スコア</div>
            <div className="font-bold">
              {Math.floor(rankings.reduce((sum, r) => sum + r.Score, 0) / rankings.length).toLocaleString()}
            </div>
          </div>
          <div className="text-center">
            <div className="text-gray-600">総プレイ回数</div>
            <div className="font-bold">{rankings.length}回</div>
          </div>
          <div className="text-center">
            <div className="text-gray-600">最高Stage</div>
            <div className="font-bold">{Math.max(...rankings.map(r => r.Stage))}</div>
          </div>
        </div>

        <button
          onClick={onBack}
          className="w-full py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600 text-sm"
        >
          戻る
        </button>
      </div>
    </div>
  );
};

export default RankingDemo;

