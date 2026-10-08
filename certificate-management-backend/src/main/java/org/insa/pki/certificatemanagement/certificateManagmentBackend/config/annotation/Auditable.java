package org.insa.pki.certificatemanagement.certificateManagmentBackend.config.annotation;

import java.lang.annotation.*;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Auditable {



    String action();

    String resource() default "";

    Level level() default Level.MEDIUM;

    boolean maskSensitiveData() default false;


    boolean async() default false;

    boolean includeRequestBody() default true;

    boolean includeResponse() default false;


    String complianceTag() default "";

    String[] tags() default {};


    String[] metadata() default {};

    enum Level {
        LOW,
        MEDIUM,
        HIGH,
        CRITICAL
    }
}