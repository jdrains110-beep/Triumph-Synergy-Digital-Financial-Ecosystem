module Api
  module V1
    class TransactionsController < ApplicationController
      skip_authenticity_token
      
      def status
        @payment = Payment.find_by(transaction_id: params[:transaction_id])
        
        if @payment
          render json: {
            success: true,
            transaction_id: @payment.transaction_id,
            status: @payment.status,
            amount: @payment.amount,
            confirmed: @payment.confirmed?,
            message: status_message(@payment.status)
          }
        else
          render json: {
            success: false,
            error: "Transaction not found"
          }, status: :not_found
        end
      end
      
      private
      
      def status_message(status)
        case status
        when "pending"
          "Waiting for Pi Network confirmation..."
        when "completed"
          "Payment completed successfully!"
        when "cancelled"
          "Payment was cancelled"
        when "failed"
          "Payment failed"
        else
          "Unknown status"
        end
      end
    end
  end
end
