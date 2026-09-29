from rest_framework import serializers
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.CharField(source='appointment.doctor.name', read_only=True)
    doctor_hospital = serializers.CharField(source='appointment.doctor.hospital_name', read_only=True)
    slot_date = serializers.DateField(source='appointment.slot.date', read_only=True)
    slot_time = serializers.TimeField(source='appointment.slot.start_time', read_only=True)
    appointment_id = serializers.IntegerField(source='appointment.id', read_only=True)
    receipt_id = serializers.CharField(source='appointment.receipt_id', read_only=True)
    original_fee = serializers.DecimalField(source='appointment.original_fee', max_digits=8, decimal_places=2, read_only=True)
    discount_amount = serializers.DecimalField(source='appointment.discount_amount', max_digits=8, decimal_places=2, read_only=True)
    coupon_code = serializers.CharField(source='appointment.coupon_code', read_only=True)

    class Meta:
        model = Payment
        fields = (
            'id', 'appointment', 'appointment_id', 'amount', 'status',
            'razorpay_order_id', 'razorpay_payment_id', 'created_at',
            'patient_name', 'doctor_name', 'doctor_hospital', 'slot_date', 'slot_time', 'receipt_id',
            'original_fee', 'discount_amount', 'coupon_code'
        )

    def get_patient_name(self, obj):
        if obj.appointment and obj.appointment.patient_name:
            return obj.appointment.patient_name
        if obj.patient:
            full_name = f"{obj.patient.first_name} {obj.patient.last_name}".strip()
            return full_name if full_name else obj.patient.username
        return ''



class VerifyPaymentSerializer(serializers.Serializer):
    razorpay_order_id = serializers.CharField()
    razorpay_payment_id = serializers.CharField()
    razorpay_signature = serializers.CharField()
