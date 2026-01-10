class CreatePayments < ActiveRecord::Migration[8.0]
  def change
    create_table :payments do |t|
      t.string :transaction_id, null: false, index: { unique: true }
      t.decimal :amount, precision: 10, scale: 2
      t.string :product_id
      t.string :user_id
      t.integer :status, default: 0
      t.boolean :confirmed, default: false
      t.text :metadata

      t.timestamps
    end
  end
end
