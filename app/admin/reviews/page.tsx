import { Check, X } from 'lucide-react';
import { mockReviews } from '@/data/mockReviews';
import RatingStars from '@/components/RatingStars';

export default function AdminReviewsPage() {
  const pendingReviews = mockReviews.filter(r => !r.isApproved);
  const approvedReviews = mockReviews.filter(r => r.isApproved);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reviews Moderation</h1>
        <p className="text-gray-600">Approve or reject customer reviews</p>
      </div>

      {pendingReviews.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Pending Reviews ({pendingReviews.length})</h2>
          <div className="space-y-4">
            {pendingReviews.map((review) => (
              <div key={review.id} className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <img src={review.userAvatar} alt={review.userName} className="w-12 h-12 rounded-full" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{review.userName}</h3>
                        <p className="text-sm text-gray-500">{new Date(review.reviewedAt).toLocaleDateString()}</p>
                      </div>
                      <RatingStars rating={review.rating} size="sm" />
                    </div>
                    <p className="text-gray-700 mb-4">{review.comment}</p>
                    <div className="flex gap-3">
                      <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        Approve
                      </button>
                      <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold flex items-center gap-2">
                        <X className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Approved Reviews ({approvedReviews.length})</h2>
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {approvedReviews.map((review) => (
                  <tr key={review.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={review.userAvatar} alt={review.userName} className="w-8 h-8 rounded-full" />
                        <span className="font-medium text-gray-900">{review.userName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <RatingStars rating={review.rating} size="sm" />
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-700 line-clamp-2 max-w-md">{review.comment}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(review.reviewedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
