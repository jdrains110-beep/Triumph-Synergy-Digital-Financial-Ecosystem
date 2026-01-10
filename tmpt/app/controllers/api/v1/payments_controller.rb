module Api
  module V1
    class PaymentsController < ApplicationController
      skip_authenticity_token
      
      def create
        @payment = Payment.new(payment_params)
        
        if @payment.save
          render json: {
            success: true,
            transaction_id: @payment.transaction_id,
            status: "pending",
            amount: @payment.amount,
            message: "Payment initiated. Awaiting Pi Network confirmation."
          }, status: :created
        else
          render json: {
            success: false,
            error: @payment.errors.full_messages.join(", "),
            status: "failed"
          }, status: :unprocessable_entity
        end
      end
      
      def show
        @payment = Payment.find_by(transaction_id: params[:id])
        
        if @payment
          render json: {
            success: true,
            transaction_id: @payment.transaction_id,
            status: @payment.status,
            amount: @payment.amount,
            user_id: @payment.user_id,
            created_at: @payment.created_at
          }
        else
          render json: {
            success: false,
            error: "Payment not found",
            status: "not_found"
          }, status: :not_found
        end
      end
      
      def index
        @payments = Payment.all.limit(50).order(created_at: :desc)
        
        render json: {
          success: true,
          count: @payments.length,
          payments: @payments.map { |p|
            {
              transaction_id: p.transaction_id,
              status: p.status,
              amount: p.amount,
              created_at: p.created_at
            }
          }
        }
      end
      
      private
      
      def payment_params
        params.require(:payment).permit(:amount, :product_id, :user_id)
      end
    end
  end
end
