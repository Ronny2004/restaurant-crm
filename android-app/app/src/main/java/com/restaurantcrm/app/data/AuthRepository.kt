package com.restaurantcrm.app.data

import com.restaurantcrm.app.data.model.UserProfile
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.user.UserInfo
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import io.github.jan.supabase.auth.providers.builtin.Email

class AuthRepository {
    private val client = SupabaseClient.client

    // Equivale a supabase.auth.signInWithPassword
    suspend fun signIn(email: String, pass: String): Result<Unit> {
        return try {
            // Nueva sintaxis de Supabase-kt para login con email
            client.auth.signInWith(Email) {
                this.email = email
                this.password = pass
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    // Equivale a session.user para obtener el ID
    fun getCurrentUser(): UserInfo? {
        return client.auth.currentUserOrNull()
    }

    // Tu fetchProfile: busca el rol en la tabla 'profiles'
    suspend fun fetchProfile(userId: String): Result<UserProfile> {
        return withContext(Dispatchers.IO) {
            try {
                val profile = client.postgrest["profiles"]
                    .select {
                        filter { eq("id", userId) }
                    }.decodeSingle<UserProfile>()
                Result.success(profile)
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    suspend fun signOut() {
        client.auth.signOut()
    }
}