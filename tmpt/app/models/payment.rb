class Payment < ApplicationRecord
  validates :amount, presence: true, numericality: { greater_than: 0 }
  validates :product_id, presence: true
  validates :user_id, presence: true
  
  before_create :generate_transaction_id
  
  enum status: { pending: 0, completed: 1, cancelled: 2, failed: 3 }
  
  scope :recent, -> { order(created_at: :desc) }
  scope :successful, -> { where(status: :completed) }
  
  private
  
  def generate_transaction_id
    self.transaction_id = "pi_txn_#{Time.current.to_i}_#{SecureRandom.hex(8)}"
  end
end
