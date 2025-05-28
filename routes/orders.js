// Delete order
router.delete('/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
    
    // First check if order exists
    const checkOrder = await pool.query('SELECT id FROM orders WHERE id = $1', [orderId]);
    
    if (checkOrder.rows.length === 0) {
      return res.status(404).json({ error: 'الطلب غير موجود' });
    }
    
    // Delete order items first (due to foreign key constraint)
    await pool.query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
    
    // Then delete the order
    await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);
    
    res.json({ message: 'تم حذف الطلب بنجاح' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'فشل في حذف الطلب' });
  }
});

module.exports = router; 