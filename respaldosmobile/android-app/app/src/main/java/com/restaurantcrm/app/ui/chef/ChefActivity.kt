package com.restaurantcrm.app.ui.chef

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.restaurantcrm.app.data.AuthRepository
import com.restaurantcrm.app.databinding.ActivityChefBinding
import com.restaurantcrm.app.ui.login.LoginActivity
import kotlinx.coroutines.launch

class ChefActivity : AppCompatActivity() {

    private lateinit var binding: ActivityChefBinding
    private val authRepository = AuthRepository()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityChefBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Recuperar nombre si se pasó por Intent
        val chefName = intent.getStringExtra("USER_NAME") ?: "Chef"
        binding.tvChefTitle.text = "Cocina: $chefName"

        binding.btnLogoutChef.setOnClickListener {
            performLogout()
        }
    }

    private fun performLogout() {
        lifecycleScope.launch {
            authRepository.signOut()
            val intent = Intent(this@ChefActivity, LoginActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            startActivity(intent)
            finish()
        }
    }
}