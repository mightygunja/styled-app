import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { paymentMethodsService as paymentService, PaymentMethod, Transaction } from '../services/paymentMethodsService';
import { getCurrentUserId } from '../services/api';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import SuccessAnimation from '../components/SuccessAnimation';
import { colors, fonts } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function PaymentMethodsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'methods' | 'history'>('methods');
  
  // Add card form
  const [cardNumber, setCardNumber] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvc, setCvc] = useState('');
  const [adding, setAdding] = useState(false);
  
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadPaymentData();
  }, []);

  const loadPaymentData = async () => {
    try {
      setLoading(true);
      const [methods, txns] = await Promise.all([
        paymentService.getPaymentMethods(getCurrentUserId()),
        paymentService.getTransactions(getCurrentUserId()),
      ]);
      setPaymentMethods(methods);
      setTransactions(txns);
    } catch (error) {
      console.error('Error loading payment data:', error);
      showToast('Failed to load payment data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async () => {
    if (!cardNumber || !expiryMonth || !expiryYear || !cvc) {
      showToast('Please fill all fields', 'error');
      return;
    }

    if (!paymentService.validateCardNumber(cardNumber)) {
      showToast('Invalid card number', 'error');
      return;
    }

    try {
      setAdding(true);
      const method = await paymentService.addPaymentMethod(
        getCurrentUserId(),
        cardNumber,
        parseInt(expiryMonth),
        parseInt(expiryYear),
        cvc
      );
      
      setPaymentMethods([...paymentMethods, method]);
      setShowAddCard(false);
      setShowSuccess(true);
      
      // Reset form
      setCardNumber('');
      setExpiryMonth('');
      setExpiryYear('');
      setCvc('');
    } catch (error) {
      console.error('Error adding card:', error);
      showToast('Failed to add card', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleSetDefault = async (methodId: string) => {
    try {
      await paymentService.setDefaultPaymentMethod(getCurrentUserId(), methodId);
      const updated = paymentMethods.map(m => ({
        ...m,
        isDefault: m.id === methodId,
      }));
      setPaymentMethods(updated);
      showToast('Default payment method updated', 'success');
    } catch (error) {
      showToast('Failed to update default method', 'error');
    }
  };

  const handleDeleteCard = (methodId: string) => {
    Alert.alert(
      'Delete Card',
      'Are you sure you want to remove this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await paymentService.deletePaymentMethod(getCurrentUserId(), methodId);
              setPaymentMethods(paymentMethods.filter(m => m.id !== methodId));
              showToast('Payment method removed', 'success');
            } catch (error) {
              showToast('Failed to remove payment method', 'error');
            }
          },
        },
      ]
    );
  };

  const getCardIcon = (brand?: string) => {
    switch (brand?.toLowerCase()) {
      case 'visa': return '💳';
      case 'mastercard': return '💳';
      case 'american express': return '💳';
      case 'discover': return '💳';
      default: return '💳';
    }
  };

  const renderPaymentMethod = (method: PaymentMethod) => (
    <View key={method.id} style={styles.methodCard}>
      <View style={styles.methodHeader}>
        <View style={styles.methodInfo}>
          <Text style={styles.methodIcon}>{getCardIcon(method.brand)}</Text>
          <View>
            <Text style={styles.methodBrand}>{method.brand || 'Card'}</Text>
            <Text style={styles.methodNumber}>•••• {method.last4}</Text>
          </View>
        </View>
        {method.isDefault && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultText}>Default</Text>
          </View>
        )}
      </View>
      
      {method.expiryMonth && method.expiryYear && (
        <Text style={styles.methodExpiry}>
          Expires {method.expiryMonth}/{method.expiryYear}
        </Text>
      )}
      
      <View style={styles.methodActions}>
        {!method.isDefault && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleSetDefault(method.id)}
          >
            <Text style={styles.actionText}>Set as Default</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteCard(method.id)}
        >
          <Text style={[styles.actionText, styles.deleteText]}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTransaction = (txn: Transaction) => (
    <View key={txn.id} style={styles.transactionCard}>
      <View style={styles.transactionHeader}>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDescription}>{txn.description}</Text>
          <Text style={styles.transactionDate}>
            {new Date(txn.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.transactionAmount}>
          <Text style={styles.amountText}>
            {paymentService.formatAmount(txn.amount)}
          </Text>
          <View style={[styles.statusBadge, styles[`status${txn.status}`]]}>
            <Text style={styles.statusText}>{txn.status}</Text>
          </View>
        </View>
      </View>
      <Text style={styles.transactionMethod}>
        {txn.paymentMethod.brand} •••• {txn.paymentMethod.last4}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tobacco} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Payments</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'methods' && styles.tabActive]}
          onPress={() => setActiveTab('methods')}
        >
          <Text style={[styles.tabText, activeTab === 'methods' && styles.tabTextActive]}>
            Payment Methods
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            Transaction History
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {activeTab === 'methods' && (
          <View style={styles.methodsContainer}>
            {paymentMethods.map(renderPaymentMethod)}
            
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddCard(true)}
            >
              <Text style={styles.addIcon}>+</Text>
              <Text style={styles.addText}>Add Payment Method</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'history' && (
          <View style={styles.historyContainer}>
            {transactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>💳</Text>
                <Text style={styles.emptyText}>No transactions yet</Text>
              </View>
            ) : (
              transactions.map(renderTransaction)
            )}
          </View>
        )}
      </ScrollView>

      {/* Add Card Modal */}
      <Modal
        visible={showAddCard}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddCard(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddCard(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Card</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.inputLabel}>Card Number</Text>
            <TextInput
              style={styles.input}
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChangeText={setCardNumber}
              keyboardType="number-pad"
              maxLength={16}
            />

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Expiry Month</Text>
                <TextInput
                  style={styles.input}
                  placeholder="MM"
                  value={expiryMonth}
                  onChangeText={setExpiryMonth}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Expiry Year</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY"
                  value={expiryYear}
                  onChangeText={setExpiryYear}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>CVC</Text>
            <TextInput
              style={styles.input}
              placeholder="123"
              value={cvc}
              onChangeText={setCvc}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
            />

            <View style={styles.securityNote}>
              <Text style={styles.securityIcon}>🔒</Text>
              <Text style={styles.securityText}>
                Your payment information is encrypted and secure
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.submitButton, adding && styles.submitButtonDisabled]}
              onPress={handleAddCard}
              disabled={adding}
            >
              {adding ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>Add Card</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <SuccessAnimation
        visible={showSuccess}
        message="Card added! 💳"
        onComplete={() => setShowSuccess(false)}
      />

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.card,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  backButton: {
    fontSize: 16,
    color: colors.inkMuted,
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.ink,
  },
  tabText: {
    fontSize: 14,
    fontFamily: fonts.sansMedium,
    color: colors.inkMuted,
  },
  tabTextActive: {
    color: colors.tobacco,
    fontFamily: fonts.sansSemiBold,
  },
  content: {
    flex: 1,
  },
  methodsContainer: {
    padding: 20,
  },
  methodCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  methodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  methodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  methodIcon: {
    fontSize: 32,
  },
  methodBrand: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 2,
  },
  methodNumber: {
    fontSize: 14,
    color: colors.inkMuted,
  },
  defaultBadge: {
    backgroundColor: colors.ink,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  defaultText: {
    fontSize: 11,
    fontFamily: fonts.sansSemiBold,
    color: colors.white,
  },
  methodExpiry: {
    fontSize: 13,
    color: colors.inkMuted,
    marginBottom: 12,
  },
  methodActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 10,
    backgroundColor: colors.paper,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.hair,
  },
  deleteButton: {
    backgroundColor: colors.sand,
    borderColor: colors.sand,
  },
  actionText: {
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  deleteText: {
    color: colors.tobacco,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: colors.paper,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.hair,
    borderStyle: 'dashed',
  },
  addIcon: {
    fontSize: 24,
    marginRight: 8,
    color: colors.inkMuted,
  },
  addText: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.inkMuted,
  },
  historyContainer: {
    padding: 20,
  },
  transactionCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  transactionInfo: {
    flex: 1,
    marginRight: 12,
  },
  transactionDescription: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statuscompleted: {
    backgroundColor: colors.sand,
  },
  statuspending: {
    backgroundColor: colors.sand,
  },
  statusrefunded: {
    backgroundColor: colors.sand,
  },
  statusfailed: {
    backgroundColor: colors.sand,
  },
  statusText: {
    fontSize: 10,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    textTransform: 'capitalize',
  },
  transactionMethod: {
    fontSize: 12,
    color: colors.inkFaint,
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.card,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  modalClose: {
    fontSize: 24,
    color: colors.inkMuted,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.hair,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.sand,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  securityIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    color: colors.tobacco,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.hair,
  },
  submitButton: {
    backgroundColor: colors.ink,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: colors.hair,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
  },
});
