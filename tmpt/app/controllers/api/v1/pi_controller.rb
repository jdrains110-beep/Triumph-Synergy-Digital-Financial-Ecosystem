module Api
  module V1
    class PiController < ApplicationController
      skip_authenticity_token
      
      def payment_complete
        payment_id = params[:paymentId]
        @payment = Payment.find_by(transaction_id: payment_id)
        
        if @payment
          @payment.update(status: "completed", confirmed: true)
          
          render json: {
            success: true,
            message: "Payment marked as completed",
            transaction_id: @payment.transaction_id,
            status: @payment.status
          }
        else
          render json: {
            success: false,
            error: "Payment not found"
          }, status: :not_found
        end
      end
      
      def payment_cancelled
        payment_id = params[:paymentId]
        @payment = Payment.find_by(transaction_id: payment_id)
        
        if @payment
          @payment.update(status: "cancelled")
          
          render json: {
            success: true,
            message: "Payment marked as cancelled",
            transaction_id: @payment.transaction_id,
            status: @payment.status
          }
        else
          render json: {
            success: false,
            error: "Payment not found"
          }, status: :not_found
        end
      end
    end
  end
end
