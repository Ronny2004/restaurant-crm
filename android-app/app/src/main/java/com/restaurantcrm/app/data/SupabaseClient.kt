package com.restaurantcrm.app.data

import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.serializer.KotlinXSerializer
import kotlinx.serialization.json.Json

object SupabaseClient {
    // TODO: Replace with your actual Supabase URL and Anon Key
    private const val SUPABASE_URL = "https://nvrjxcgkfjjarxgdefvs.supabase.co"
    private const val SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52cmp4Y2drZmpqYXJ4Z2RlZnZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5OTY0OTEsImV4cCI6MjA4MDU3MjQ5MX0.pA7Y2iFzipHK-eIobsa0UdfVWD97op62QCqPtqWlXoY"

    val client = createSupabaseClient(
        supabaseUrl = SUPABASE_URL,
        supabaseKey = SUPABASE_KEY
    ) {
        install(Auth)
        install(Postgrest)
        
        defaultSerializer = KotlinXSerializer(Json {
            ignoreUnknownKeys = true
        })
    }
}
