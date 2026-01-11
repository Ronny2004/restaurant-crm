package com.restaurantcrm.app.ui.cashier

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.restaurantcrm.app.data.AuthRepository
import com.restaurantcrm.app.databinding.ActivityCashierBinding
import com.restaurantcrm.app.ui.login.LoginActivity
import kotlinx.coroutines.launch

class CashierActivity : AppCompatActivity() {

    private lateinit var binding: ActivityCashierBinding
    private val authRepository = AuthRepository()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityCashierBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.btnLogoutCashier.setOnClickListener {
            performLogout()
        }
    }

    private fun performLogout() {
        lifecycleScope.launch {
            authRepository.signOut()
            val intent = Intent(this@CashierActivity, LoginActivity::class.java)
            // IMPORTANTE: Limpiar el historial para que no pueda volver a la caja sin login
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            startActivity(intent)
            finish()
        }
    }
}